import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import {
  auditoria,
  convitesAtivacao,
  sessoesLogin,
  usuarios,
  type Db,
} from '@clinica/database';
import type {
  Ativacao,
  CadastroUsuario,
  FiltroUsuarios,
  UsuarioListado,
} from '@clinica/shared';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosService } from '../../parametros/parametros.service';
import { gerarHashSenha, gerarToken, hashToken } from './credenciais';

const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const NOMES_PERFIL = {
  secretaria: 'Secretaria',
  estagiario: 'Estagiário',
  supervisor: 'Supervisor',
  coordenacao: 'Coordenação',
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly email: EmailService,
    private readonly parametros: ParametrosService,
    private readonly config: ConfigService,
  ) {}

  // Lista de usuários da coordenação (RF53 e RF54), com a situação do convite.
  async listar(filtro: FiltroUsuarios): Promise<UsuarioListado[]> {
    const condicoes = [
      filtro.perfil ? eq(usuarios.perfil, filtro.perfil) : undefined,
      filtro.situacao ? eq(usuarios.situacao, filtro.situacao) : undefined,
      filtro.busca
        ? or(
            ilike(usuarios.nome, `%${filtro.busca}%`),
            ilike(usuarios.email, `%${filtro.busca}%`),
          )
        : undefined,
    ];
    const lista = await this.db
      .select()
      .from(usuarios)
      .where(and(...condicoes))
      .orderBy(asc(usuarios.nome));
    if (lista.length === 0) return [];

    const ids = lista.map((u) => u.id);
    const convites = await this.db
      .select()
      .from(convitesAtivacao)
      .where(inArray(convitesAtivacao.usuarioId, ids))
      .orderBy(desc(convitesAtivacao.criadoEm));
    const desativacoes = await this.db
      .select({ id: auditoria.entidadeId, em: auditoria.criadoEm })
      .from(auditoria)
      .where(
        and(
          eq(auditoria.operacao, 'desativar_usuario'),
          inArray(auditoria.entidadeId, ids),
        ),
      )
      .orderBy(desc(auditoria.criadoEm));

    return lista.map((u) => {
      const convite = convites.find((c) => c.usuarioId === u.id);
      const desativacao = desativacoes.find((d) => d.id === u.id);
      return {
        id: u.id,
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
        situacao: u.situacao,
        conviteEnviadoEm:
          u.situacao === 'pendente_ativacao' && convite
            ? convite.criadoEm.toISOString()
            : null,
        conviteExpiraEm:
          u.situacao === 'pendente_ativacao' && convite
            ? convite.expiraEm.toISOString()
            : null,
        conviteVencido:
          u.situacao === 'pendente_ativacao' &&
          !!convite &&
          convite.expiraEm.getTime() <= Date.now(),
        desativadoEm:
          u.situacao === 'desativado' && desativacao
            ? desativacao.em.toISOString()
            : null,
      };
    });
  }

  // Cadastro com perfil e envio do convite de ativação (RF53).
  async cadastrar(dados: CadastroUsuario, autor: UsuarioAutenticado) {
    const [existente] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, dados.email));
    if (existente) {
      throw new ConflictException(
        'Este e-mail já está cadastrado para outro usuário.',
      );
    }
    const horas = await this.parametros.numero('validade_convite_horas');
    const { usuario, token } = await this.db.transaction(async (tx) => {
      const [usuario] = await tx
        .insert(usuarios)
        .values({ ...dados, situacao: 'pendente_ativacao' })
        .returning();
      const token = await this.criarConvite(tx, usuario.id, horas);
      await this.auditoria.registrar(
        {
          usuarioId: autor.id,
          operacao: 'cadastrar_usuario',
          entidade: 'usuarios',
          entidadeId: usuario.id,
          dadosNovos: dados,
        },
        tx,
      );
      return { usuario, token };
    });
    await this.enviarConvite(usuario, token, horas);
    return { id: usuario.id, situacao: usuario.situacao };
  }

  // Reenvio do convite: o anterior deixa de valer (RF53).
  async reenviarConvite(id: string, autor: UsuarioAutenticado) {
    const usuario = await this.buscar(id);
    if (usuario.situacao !== 'pendente_ativacao') {
      throw new ConflictException(
        'Só é possível reenviar o convite de quem ainda não ativou a conta.',
      );
    }
    const horas = await this.parametros.numero('validade_convite_horas');
    const token = await this.db.transaction(async (tx) => {
      await tx
        .update(convitesAtivacao)
        .set({ invalidadoEm: new Date() })
        .where(
          and(
            eq(convitesAtivacao.usuarioId, id),
            isNull(convitesAtivacao.usadoEm),
            isNull(convitesAtivacao.invalidadoEm),
          ),
        );
      const token = await this.criarConvite(tx, id, horas);
      await this.auditoria.registrar(
        {
          usuarioId: autor.id,
          operacao: 'reenviar_convite',
          entidade: 'usuarios',
          entidadeId: id,
        },
        tx,
      );
      return token;
    });
    await this.enviarConvite(usuario, token, horas);
  }

  // Desativação (RF54): nada é apagado; as sessões abertas são revogadas.
  async desativar(id: string, autor: UsuarioAutenticado) {
    if (id === autor.id) {
      throw new ForbiddenException(
        'A coordenação não pode desativar a própria conta.',
      );
    }
    const usuario = await this.buscar(id);
    if (usuario.situacao === 'desativado') {
      throw new ConflictException('Este usuário já está desativado.');
    }
    await this.db.transaction(async (tx) => {
      await tx
        .update(usuarios)
        .set({ situacao: 'desativado' })
        .where(eq(usuarios.id, id));
      await tx
        .update(sessoesLogin)
        .set({ revogadaEm: new Date() })
        .where(
          and(eq(sessoesLogin.usuarioId, id), isNull(sessoesLogin.revogadaEm)),
        );
      await tx
        .update(convitesAtivacao)
        .set({ invalidadoEm: new Date() })
        .where(
          and(
            eq(convitesAtivacao.usuarioId, id),
            isNull(convitesAtivacao.usadoEm),
            isNull(convitesAtivacao.invalidadoEm),
          ),
        );
      await this.auditoria.registrar(
        {
          usuarioId: autor.id,
          operacao: 'desativar_usuario',
          entidade: 'usuarios',
          entidadeId: id,
          dadosAnteriores: { situacao: usuario.situacao },
          dadosNovos: { situacao: 'desativado' },
        },
        tx,
      );
    });
  }

  // Dados mostrados na página de ativação, se o convite ainda vale (RF53).
  async conviteValido(token: string) {
    const { usuario } = await this.buscarConviteValido(token);
    return { nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
  }

  // Ativação da conta: grava o hash da senha e marca o convite como usado (RF53).
  async ativar(dados: Ativacao) {
    const { convite, usuario } = await this.buscarConviteValido(dados.token);
    const senhaHash = await gerarHashSenha(dados.senha);
    await this.db.transaction(async (tx) => {
      await tx
        .update(usuarios)
        .set({ senhaHash, situacao: 'ativo' })
        .where(eq(usuarios.id, usuario.id));
      await tx
        .update(convitesAtivacao)
        .set({ usadoEm: new Date() })
        .where(eq(convitesAtivacao.id, convite.id));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'ativar_conta',
          entidade: 'usuarios',
          entidadeId: usuario.id,
          dadosAnteriores: { situacao: 'pendente_ativacao' },
          dadosNovos: { situacao: 'ativo' },
        },
        tx,
      );
    });
  }

  private async buscar(id: string) {
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id));
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return usuario;
  }

  private async buscarConviteValido(token: string) {
    const [linha] = await this.db
      .select({ convite: convitesAtivacao, usuario: usuarios })
      .from(convitesAtivacao)
      .innerJoin(usuarios, eq(usuarios.id, convitesAtivacao.usuarioId))
      .where(eq(convitesAtivacao.tokenHash, hashToken(token)));
    const invalido =
      !linha ||
      linha.convite.usadoEm ||
      linha.convite.invalidadoEm ||
      linha.convite.expiraEm.getTime() <= Date.now() ||
      linha.usuario.situacao !== 'pendente_ativacao';
    if (invalido) {
      throw new GoneException('Este link de ativação não é mais válido.');
    }
    return linha;
  }

  // Recebe a validade já lida: dentro da transação, toda consulta usa o próprio tx.
  private async criarConvite(tx: Transacao, usuarioId: string, horas: number) {
    const { token, hash } = gerarToken();
    await tx.insert(convitesAtivacao).values({
      usuarioId,
      tokenHash: hash,
      expiraEm: new Date(Date.now() + horas * 3_600_000),
    });
    return token;
  }

  private async enviarConvite(
    {
      nome,
      email,
      perfil,
    }: { nome: string; email: string; perfil: keyof typeof NOMES_PERFIL },
    token: string,
    horas: number,
  ) {
    const link = `${this.config.getOrThrow<string>('WEB_URL')}/ativacao/${token}`;
    await this.email.enviar(
      email,
      'Convite para o sistema da Clínica Escola FBr',
      `<p>Olá, ${escaparHtml(nome)}.</p>
<p>A coordenação da Clínica Escola de Psicologia da FBr cadastrou você no sistema com o perfil <strong>${NOMES_PERFIL[perfil]}</strong>.</p>
<p>Para criar a sua senha e ativar a conta, acesse: <a href="${link}">${link}</a></p>
<p>O link vale por ${horas} horas e só pode ser usado uma vez.</p>`,
    );
  }
}
