import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
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

@Injectable()
export class SessoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Entrada com e-mail e senha (RF50). Qualquer falha devolve a mesma mensagem.
  async entrar({ email, senha }: Login) {
    const agora = new Date();
    const [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email));

    if (usuario?.bloqueadoAte && usuario.bloqueadoAte > agora) {
      throw this.bloqueio(usuario.bloqueadoAte);
    }

    hashFalso ??= gerarHashSenha('senha-que-nunca-confere-1');
    const senhaConfere = await conferirSenha(
      senha,
      usuario?.senhaHash ?? (await hashFalso),
    );
    if (
      !usuario ||
      !usuario.senhaHash ||
      !senhaConfere ||
      usuario.situacao !== 'ativo'
    ) {
      if (usuario) await this.registrarFalha(usuario.id, agora);
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

  // Soma a tentativa com erro; na 3ª seguida, bloqueia por 15 minutos.
  private async registrarFalha(usuarioId: string, agora: Date) {
    const [{ tentativas }] = await this.db
      .update(usuarios)
      .set({ tentativasFalhas: sql`${usuarios.tentativasFalhas} + 1` })
      .where(eq(usuarios.id, usuarioId))
      .returning({ tentativas: usuarios.tentativasFalhas });
    if (tentativas < TENTATIVAS_ATE_BLOQUEIO) return;
    const ate = minutos(MINUTOS_BLOQUEIO, agora);
    await this.db
      .update(usuarios)
      .set({ tentativasFalhas: 0, bloqueadoAte: ate })
      .where(eq(usuarios.id, usuarioId));
    throw this.bloqueio(ate);
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
