import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  ne,
  or,
} from 'drizzle-orm';
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
  ResultadoCadastroUsuario,
  UsuarioListado,
} from '@clinica/shared';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import { escaparLike } from '../../common/busca';
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

const EMAIL_REPETIDO = 'Este e-mail já está cadastrado para outro usuário.';
const LINK_INVALIDO = 'Este link de ativação não é mais válido.';

// Violação de unique no Postgres (23505), direto ou embrulhada pelo Drizzle.
const violaUnico = (erro: unknown) => {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

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
            ilike(usuarios.nome, `%${escaparLike(filtro.busca)}%`),
            ilike(usuarios.email, `%${escaparLike(filtro.busca)}%`),
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
  async cadastrar(
    dados: CadastroUsuario,
    autor: UsuarioAutenticado,
  ): Promise<ResultadoCadastroUsuario> {
    const [existente] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, dados.email));
    if (existente) throw new ConflictException(EMAIL_REPETIDO);
    const horas = await this.parametros.numero('validade_convite_horas');
    // Dois cadastros simultâneos passam pela consulta acima; o unique do banco decide.
    const { usuario, token } = await this.db
      .transaction(async (tx) => {
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
      })
      .catch((erro: unknown) => {
        if (violaUnico(erro)) throw new ConflictException(EMAIL_REPETIDO);
        throw erro;
      });
    // O e-mail sai depois do commit: se falhar, o cadastro continua valendo e a
    // coordenação reenvia o convite pela lista.
    let conviteEnviado = true;
    try {
      await this.enviarConvite(usuario, token, horas);
    } catch (erro) {
      conviteEnviado = false;
      this.logger.error(`Convite não enviado para ${usuario.id}`, erro);
    }
    return { id: usuario.id, situacao: usuario.situacao, conviteEnviado };
  }

  // Primeira conta da coordenação de um ambiente novo (implantação), criada pelo
  // script primeira-coordenacao, sem autor: só vale se nenhuma conta da
  // coordenação existir ainda. Se o convite não sair por e-mail, o link volta
  // para quem rodou o script repassar.
  async cadastrarPrimeiraCoordenacao(dados: { nome: string; email: string }) {
    const horas = await this.parametros.numero('validade_convite_horas');
    const { usuario, token } = await this.db.transaction(async (tx) => {
      const [existente] = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.perfil, 'coordenacao'),
            ne(usuarios.situacao, 'desativado'),
          ),
        );
      if (existente) {
        throw new ConflictException(
          'Este ambiente já tem uma conta da coordenação. Os próximos usuários são cadastrados por ela.',
        );
      }
      const [usuario] = await tx
        .insert(usuarios)
        .values({
          ...dados,
          perfil: 'coordenacao',
          situacao: 'pendente_ativacao',
        })
        .returning();
      const token = await this.criarConvite(tx, usuario.id, horas);
      await this.auditoria.registrar(
        {
          usuarioId: null,
          operacao: 'cadastrar_primeira_coordenacao',
          entidade: 'usuarios',
          entidadeId: usuario.id,
          dadosNovos: dados,
        },
        tx,
      );
      return { usuario, token };
    });
    try {
      await this.enviarConvite(usuario, token, horas);
      return { id: usuario.id, conviteEnviado: true as const };
    } catch (erro) {
      this.logger.error(`Convite não enviado para ${usuario.id}`, erro);
      const link = `${this.config.getOrThrow<string>('WEB_URL')}/ativacao/${token}`;
      return { id: usuario.id, conviteEnviado: false as const, link };
    }
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
    try {
      await this.enviarConvite(usuario, token, horas);
    } catch (erro) {
      this.logger.error(`Convite não reenviado para ${id}`, erro);
      throw new ServiceUnavailableException(
        'O e-mail do convite não pôde ser enviado agora. Tente reenviar em instantes.',
      );
    }
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
      if (usuario.perfil === 'coordenacao' && usuario.situacao === 'ativo') {
        // Trava as contas ativas da coordenação: duas desativações ao mesmo
        // tempo não podem deixar a coordenação sem nenhuma conta ativa.
        const ativas = await tx
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.perfil, 'coordenacao'),
              eq(usuarios.situacao, 'ativo'),
            ),
          )
          .orderBy(usuarios.id)
          .for('update');
        if (!ativas.some((conta) => conta.id !== id)) {
          throw new ConflictException(
            'Esta é a única conta ativa da coordenação. Ative outra conta da coordenação antes de desativar esta.',
          );
        }
      }
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
  // As duas gravações repetem as condições da consulta inicial: enquanto o hash da
  // senha é calculado, outro envio do mesmo link ou uma desativação pode chegar
  // antes, e então nenhuma linha muda e a resposta é 410.
  async ativar(dados: Ativacao) {
    const { convite, usuario } = await this.buscarConviteValido(dados.token);
    const senhaHash = await gerarHashSenha(dados.senha);
    await this.db.transaction(async (tx) => {
      const agora = new Date();
      const usado = await tx
        .update(convitesAtivacao)
        .set({ usadoEm: agora })
        .where(
          and(
            eq(convitesAtivacao.id, convite.id),
            isNull(convitesAtivacao.usadoEm),
            isNull(convitesAtivacao.invalidadoEm),
            gt(convitesAtivacao.expiraEm, agora),
          ),
        )
        .returning({ id: convitesAtivacao.id });
      if (usado.length === 0) throw new GoneException(LINK_INVALIDO);
      const ativado = await tx
        .update(usuarios)
        .set({ senhaHash, situacao: 'ativo' })
        .where(
          and(
            eq(usuarios.id, usuario.id),
            eq(usuarios.situacao, 'pendente_ativacao'),
          ),
        )
        .returning({ id: usuarios.id });
      if (ativado.length === 0) throw new GoneException(LINK_INVALIDO);
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
      throw new GoneException(LINK_INVALIDO);
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
