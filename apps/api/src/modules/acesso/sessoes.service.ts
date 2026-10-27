import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { sessoesLogin, usuarios, type Db } from '@clinica/database';
import type { Login } from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import {
  conferirSenha,
  gerarHashSenha,
  gerarToken,
  hashToken,
} from './credenciais';

// Bloqueio na 3ª tentativa seguida com erro, por 15 minutos (RNF49, DF25).
export const TENTATIVAS_ATE_BLOQUEIO = 3;
const MINUTOS_BLOQUEIO = 15;
// A sessão parada por 30 minutos expira (RNF50).
export const MINUTOS_INATIVIDADE = 30;

const MENSAGEM_CREDENCIAIS = 'E-mail ou senha incorretos.';
const minutos = (m: number, a = new Date()) =>
  new Date(a.getTime() + m * 60_000);

// Hash usado quando o e-mail não existe, para a resposta levar o mesmo tempo.
let hashFalso: Promise<string> | undefined;
const hashDeComparacao = () =>
  (hashFalso ??= gerarHashSenha('senha-que-nunca-confere-1'));
// Limite de e-mails desconhecidos guardados em memória.
const MAX_DESCONHECIDOS = 10_000;

type Tentativas = { tentativas: number; bloqueadoAte: Date | null };

@Injectable()
export class SessoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Tentativas com e-mails que não existem. Eles também chegam ao bloqueio,
  // para a resposta não revelar quais e-mails têm conta.
  private readonly desconhecidos = new Map<string, Tentativas>();

  // Entrada com e-mail e senha (RF50). Qualquer falha devolve a mesma mensagem.
  async entrar({ email, senha }: Login) {
    const agora = new Date();

    // A tentativa é reservada antes de conferir a senha, numa única operação:
    // tentativas simultâneas não passam de 3 por janela de bloqueio (RNF49).
    const ate = minutos(MINUTOS_BLOQUEIO, agora);
    const vaiBloquear = sql`${usuarios.tentativasFalhas} + 1 >= ${TENTATIVAS_ATE_BLOQUEIO}`;
    const [usuario] = await this.db
      .update(usuarios)
      .set({
        tentativasFalhas: sql`CASE WHEN ${vaiBloquear} THEN 0 ELSE ${usuarios.tentativasFalhas} + 1 END`,
        bloqueadoAte: sql`CASE WHEN ${vaiBloquear} THEN ${ate.toISOString()}::timestamptz ELSE NULL END`,
      })
      .where(
        and(
          eq(usuarios.email, email),
          or(isNull(usuarios.bloqueadoAte), lte(usuarios.bloqueadoAte, agora)),
        ),
      )
      .returning();

    if (!usuario) {
      const [bloqueado] = await this.db
        .select({ bloqueadoAte: usuarios.bloqueadoAte })
        .from(usuarios)
        .where(eq(usuarios.email, email));
      if (bloqueado?.bloqueadoAte) throw this.bloqueio(bloqueado.bloqueadoAte);
      return this.falharDesconhecido(email, senha, agora);
    }

    const senhaConfere = await conferirSenha(
      senha,
      usuario.senhaHash ?? (await hashDeComparacao()),
    );
    if (!usuario.senhaHash || !senhaConfere || usuario.situacao !== 'ativo') {
      if (usuario.bloqueadoAte) throw this.bloqueio(usuario.bloqueadoAte);
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }

    const { token, hash } = gerarToken();
    await this.db.transaction(async (tx) => {
      await tx
        .update(usuarios)
        .set({ tentativasFalhas: 0, bloqueadoAte: null })
        .where(eq(usuarios.id, usuario.id));
      await tx.insert(sessoesLogin).values({
        usuarioId: usuario.id,
        tokenHash: hash,
        expiraEm: minutos(MINUTOS_INATIVIDADE, agora),
      });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'entrar',
          entidade: 'sessoes_login',
        },
        tx,
      );
    });
    const autenticado: UsuarioAutenticado = {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    };
    return { token, usuario: autenticado };
  }

  // Usuário de uma sessão válida, ou null. Cada uso renova a expiração (RNF50).
  async validar(token: string): Promise<UsuarioAutenticado | null> {
    const agora = new Date();
    const [sessao] = await this.db
      .select({
        id: sessoesLogin.id,
        usuarioId: usuarios.id,
        nome: usuarios.nome,
        perfil: usuarios.perfil,
      })
      .from(sessoesLogin)
      .innerJoin(usuarios, eq(usuarios.id, sessoesLogin.usuarioId))
      .where(
        and(
          eq(sessoesLogin.tokenHash, hashToken(token)),
          isNull(sessoesLogin.revogadaEm),
          gt(sessoesLogin.expiraEm, agora),
          eq(usuarios.situacao, 'ativo'),
        ),
      );
    if (!sessao) return null;
    await this.db
      .update(sessoesLogin)
      .set({ expiraEm: minutos(MINUTOS_INATIVIDADE, agora) })
      .where(eq(sessoesLogin.id, sessao.id));
    return { id: sessao.usuarioId, nome: sessao.nome, perfil: sessao.perfil };
  }

  // Encerramento da sessão pelo próprio usuário (RF51).
  async sair(token: string) {
    const [sessao] = await this.db
      .update(sessoesLogin)
      .set({ revogadaEm: new Date() })
      .where(
        and(
          eq(sessoesLogin.tokenHash, hashToken(token)),
          isNull(sessoesLogin.revogadaEm),
        ),
      )
      .returning({ usuarioId: sessoesLogin.usuarioId });
    if (sessao) {
      await this.auditoria.registrar({
        usuarioId: sessao.usuarioId,
        operacao: 'sair',
        entidade: 'sessoes_login',
      });
    }
  }

  // E-mail sem conta: confere um hash falso e conta a tentativa em memória,
  // com o mesmo bloqueio de uma conta real.
  private async falharDesconhecido(
    email: string,
    senha: string,
    agora: Date,
  ): Promise<never> {
    const atual = this.desconhecidos.get(email);
    if (atual?.bloqueadoAte && atual.bloqueadoAte > agora) {
      throw this.bloqueio(atual.bloqueadoAte);
    }
    // Como na conta real, a tentativa é reservada antes de qualquer espera:
    // tentativas simultâneas também não passam de 3.
    const tentativas = (atual?.bloqueadoAte ? 0 : (atual?.tentativas ?? 0)) + 1;
    const ate =
      tentativas >= TENTATIVAS_ATE_BLOQUEIO
        ? minutos(MINUTOS_BLOQUEIO, agora)
        : null;
    this.liberarEspaco(agora);
    this.desconhecidos.set(
      email,
      ate
        ? { tentativas: 0, bloqueadoAte: ate }
        : { tentativas, bloqueadoAte: null },
    );
    await conferirSenha(senha, await hashDeComparacao());
    if (ate) throw this.bloqueio(ate);
    throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
  }

  // Com a lista cheia, sai primeiro quem não está bloqueado, do mais antigo
  // para o mais novo, para um bloqueio ativo não ser apagado antes da hora.
  private liberarEspaco(agora: Date) {
    if (this.desconhecidos.size < MAX_DESCONHECIDOS) return;
    for (const [email, t] of this.desconhecidos) {
      if (!t.bloqueadoAte || t.bloqueadoAte <= agora)
        this.desconhecidos.delete(email);
      if (this.desconhecidos.size < MAX_DESCONHECIDOS) return;
    }
    const maisAntigo = this.desconhecidos.keys().next().value;
    if (maisAntigo !== undefined) this.desconhecidos.delete(maisAntigo);
  }

  private bloqueio(ate: Date) {
    return new HttpException(
      {
        statusCode: HttpStatus.LOCKED,
        message: `Acesso bloqueado por ${MINUTOS_BLOQUEIO} minutos.`,
        bloqueadoAte: ate.toISOString(),
      },
      HttpStatus.LOCKED,
    );
  }
}
