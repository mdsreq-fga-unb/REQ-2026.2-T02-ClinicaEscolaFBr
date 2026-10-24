import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  prontuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';

// Regra de acesso ao prontuário (RF55): só o estagiário responsável e o supervisor
// do caso veem o conteúdo clínico. A verificação é feita na API, e todo acesso,
// permitido ou negado, é registrado (RNF52). A resposta negada é a mesma para
// prontuário inexistente, para não revelar o que existe (RNF25).
@Injectable()
export class PoliticaProntuario {
  constructor(@Inject(DB) private readonly db: Db) {}

  async exigirAcesso(
    usuario: UsuarioAutenticado,
    prontuarioId: string,
    operacao: string,
  ) {
    const [linha] = await this.db
      .select({
        prontuario: prontuarios,
        estagiarioId: vinculosEstagiario.estagiarioId,
        supervisorId: atribuicoesSupervisor.supervisorId,
      })
      .from(prontuarios)
      .leftJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, prontuarios.casoId),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .leftJoin(
        atribuicoesSupervisor,
        and(
          eq(atribuicoesSupervisor.casoId, prontuarios.casoId),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      )
      .where(eq(prontuarios.id, prontuarioId));

    const permitido =
      !!linha &&
      ((usuario.perfil === 'estagiario' && linha.estagiarioId === usuario.id) ||
        (usuario.perfil === 'supervisor' && linha.supervisorId === usuario.id));

    await this.db.insert(acessosProntuario).values({
      prontuarioId: linha?.prontuario.id ?? null,
      usuarioId: usuario.id,
      perfil: usuario.perfil,
      operacao,
      permitido,
    });

    if (!permitido) {
      throw new ForbiddenException('Você não tem acesso a este prontuário.');
    }
    return linha.prontuario;
  }
}
