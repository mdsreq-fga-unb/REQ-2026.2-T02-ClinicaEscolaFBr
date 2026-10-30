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
// Entradas simultâneas esperam uma vaga por até 5 segundos, conferindo de 100 em
// 100 ms. Uma reserva com mais de 30 segundos é descartada, caso o processo da
// API tenha caído no meio da conferência (#176).
export const ESPERA_MAXIMA_MS = 5_000;
const ESPERA_MS = 100;
const SEGUNDOS_RESERVA = 30;
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

type Tentativas = {
  tentativas: number;
  bloqueadoAte: Date | null;
  emCurso: number;
};

@Injectable()
export class SessoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Tentativas com e-mails que não existem. Eles seguem a mesma regra da conta
  // real, com as mesmas esperas, para a resposta e o tempo dela não revelarem
  // quais e-mails têm conta.
  private readonly desconhecidos = new Map<string, Tentativas>();

  // Entrada com e-mail e senha (RF50). Qualquer falha devolve a mesma mensagem.
  async entrar({ email, senha }: Login) {
    const usuario = await this.reservarEntrada(email);
    if (!usuario) return this.entrarDesconhecido(email, senha);

    // A vaga reservada volta mesmo se der erro no meio do caminho: senão, ela
    // ficaria presa e as entradas seguintes esperariam por ela.
    let devolvida = false;
    try {
      const senhaConfere = await conferirSenha(
        senha,
        usuario.senhaHash ?? (await hashDeComparacao()),
      );
      if (!usuario.senhaHash || !senhaConfere || usuario.situacao !== 'ativo') {
        // Só a senha errada conta como erro: na 3ª seguida, bloqueia (RNF49).
        const ate = minutos(MINUTOS_BLOQUEIO);
        const vaiBloquear = sql`${usuarios.tentativasFalhas} + 1 >= ${TENTATIVAS_ATE_BLOQUEIO}`;
        const [depois] = await this.db
          .update(usuarios)
          .set({
            entradasEmCurso: sql`greatest(${usuarios.entradasEmCurso} - 1, 0)`,
            tentativasFalhas: sql`CASE WHEN ${vaiBloquear} THEN 0 ELSE ${usuarios.tentativasFalhas} + 1 END`,
            bloqueadoAte: sql`CASE WHEN ${vaiBloquear} THEN ${ate.toISOString()}::timestamptz ELSE ${usuarios.bloqueadoAte} END`,
          })
          .where(eq(usuarios.id, usuario.id))
          .returning({ bloqueadoAte: usuarios.bloqueadoAte });
        devolvida = true;
        // Compara com a hora de agora, e não com a do início da entrada: um
        // bloqueio antigo que venceu durante a espera não vale mais.
        if (depois?.bloqueadoAte && depois.bloqueadoAte > new Date()) {
          throw this.bloqueio(depois.bloqueadoAte);
        }
        throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
      }

      const { token, hash } = gerarToken();
      await this.db.transaction(async (tx) => {
        await tx
          .update(usuarios)
          .set({
            tentativasFalhas: 0,
            bloqueadoAte: null,
            entradasEmCurso: sql`greatest(${usuarios.entradasEmCurso} - 1, 0)`,
          })
          .where(eq(usuarios.id, usuario.id));
        await tx.insert(sessoesLogin).values({
          usuarioId: usuario.id,
          tokenHash: hash,
          expiraEm: minutos(MINUTOS_INATIVIDADE),
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
      devolvida = true;
      const autenticado: UsuarioAutenticado = {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
      };
      return { token, usuario: autenticado };
    } finally {
      // Com rollback na transação, a devolução dentro dela também é desfeita.
      if (!devolvida) await this.devolverVaga(usuario.id);
    }
  }

  // Reserva a conferência de uma entrada, numa única operação: os erros somados
  // às entradas em curso não passam de 3, para tentativas simultâneas não
  // driblarem o bloqueio (RNF49). Quando as 3 vagas estão ocupadas por entradas
  // em curso, espera uma vaga, em vez de bloquear: entradas simultâneas com a
  // senha certa são todas aceitas (#176). Devolve null se o e-mail não tem conta.
  // As horas vêm todas do relógio da API, para não misturar com o do banco.
  private reservarEntrada(email: string) {
    return this.esperarVaga(async () => {
      const agora = new Date();
      const limite = new Date(agora.getTime() - SEGUNDOS_RESERVA * 1_000);
      const emCurso = sql`CASE WHEN ${usuarios.emCursoDesde} > ${limite.toISOString()}::timestamptz THEN ${usuarios.entradasEmCurso} ELSE 0 END`;
      const [usuario] = await this.db
        .update(usuarios)
        .set({ entradasEmCurso: sql`${emCurso} + 1`, emCursoDesde: agora })
        .where(
          and(
            eq(usuarios.email, email),
            or(
              isNull(usuarios.bloqueadoAte),
              lte(usuarios.bloqueadoAte, agora),
            ),
            sql`${usuarios.tentativasFalhas} + ${emCurso} < ${TENTATIVAS_ATE_BLOQUEIO}`,
          ),
        )
        .returning();
      if (usuario) return usuario;

      const [conta] = await this.db
        .select({ bloqueadoAte: usuarios.bloqueadoAte })
        .from(usuarios)
        .where(eq(usuarios.email, email));
      if (!conta) return null;
      if (conta.bloqueadoAte && conta.bloqueadoAte > agora) {
        throw this.bloqueio(conta.bloqueadoAte);
      }
      return undefined;
    });
  }

  // Devolve a vaga de uma entrada que terminou com erro inesperado.
  private async devolverVaga(usuarioId: string) {
    await this.db
      .update(usuarios)
      .set({
        entradasEmCurso: sql`greatest(${usuarios.entradasEmCurso} - 1, 0)`,
      })
      .where(eq(usuarios.id, usuarioId));
  }

  // Repete a tentativa de reservar até ela devolver algo diferente de undefined
  // (sem vaga), por até 5 segundos contados no relógio, e não em voltas.
  private async esperarVaga<T>(
    tentar: () => Promise<T | undefined>,
  ): Promise<T> {
    const inicio = Date.now();
    for (;;) {
      const reserva = await tentar();
      if (reserva !== undefined) return reserva;
      if (Date.now() - inicio >= ESPERA_MAXIMA_MS) break;
      await new Promise((pronto) => setTimeout(pronto, ESPERA_MS));
    }
    throw new HttpException(
      'Muitas tentativas de entrada ao mesmo tempo. Tente de novo em instantes.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
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
  // com a mesma reserva, a mesma espera e o mesmo bloqueio de uma conta real.
  private async entrarDesconhecido(
    email: string,
    senha: string,
  ): Promise<never> {
    const tentativa = await this.esperarVaga(async () => {
      const agora = new Date();
      const atual = this.desconhecidos.get(email) ?? {
        tentativas: 0,
        bloqueadoAte: null,
        emCurso: 0,
      };
      if (atual.bloqueadoAte && atual.bloqueadoAte > agora) {
        throw this.bloqueio(atual.bloqueadoAte);
      }
      if (atual.bloqueadoAte) {
        atual.tentativas = 0;
        atual.bloqueadoAte = null;
      }
      if (atual.tentativas + atual.emCurso >= TENTATIVAS_ATE_BLOQUEIO) {
        return undefined;
      }
      atual.emCurso += 1;
      if (!this.desconhecidos.has(email)) this.liberarEspaco(agora);
      this.desconhecidos.set(email, atual);
      return atual;
    });

    try {
      await conferirSenha(senha, await hashDeComparacao());
    } finally {
      tentativa.emCurso -= 1;
    }
    tentativa.tentativas += 1;
    if (tentativa.tentativas >= TENTATIVAS_ATE_BLOQUEIO) {
      tentativa.tentativas = 0;
      tentativa.bloqueadoAte = minutos(MINUTOS_BLOQUEIO);
      this.desconhecidos.set(email, tentativa);
      throw this.bloqueio(tentativa.bloqueadoAte);
    }
    this.desconhecidos.set(email, tentativa);
    throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
  }

  // Com a lista cheia, sai primeiro quem não está bloqueado nem conferindo, do
  // mais antigo para o mais novo, para um bloqueio ativo não ser apagado antes
  // da hora.
  private liberarEspaco(agora: Date) {
    if (this.desconhecidos.size < MAX_DESCONHECIDOS) return;
    for (const [email, t] of this.desconhecidos) {
      if ((!t.bloqueadoAte || t.bloqueadoAte <= agora) && t.emCurso === 0)
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
