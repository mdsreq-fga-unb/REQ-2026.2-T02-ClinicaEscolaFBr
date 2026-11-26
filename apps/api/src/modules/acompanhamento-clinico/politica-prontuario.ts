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
// do caso veem o conteúdo clínico, e a coordenação consulta qualquer prontuário,
// sem registrar nem alterar nada nele (DF32). A verificação é feita na API, e todo acesso,
// permitido ou negado, é registrado (RNF52). A resposta negada é a mesma para
// prontuário inexistente, para não revelar o que existe (RNF25). A única exceção
// por perfil é o relatório final aprovado (RF33): no modo 'relatorio_final', a
// secretaria também passa, e a operação restringe o que ela vê ou faz.
@Injectable()
export class PoliticaProntuario {
  constructor(@Inject(DB) private readonly db: Db) {}

  async exigirAcesso(
    usuario: UsuarioAutenticado,
    prontuarioId: string,
    operacao: string,
    modo: 'leitura' | 'escrita' | 'registro_estagiario' | 'relatorio_final',
    condicaoDaOperacao = true,
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
        (usuario.perfil === 'supervisor' &&
          linha.supervisorId === usuario.id &&
          modo !== 'registro_estagiario') ||
        (usuario.perfil === 'coordenacao' &&
          (modo === 'leitura' || modo === 'relatorio_final')) ||
        (usuario.perfil === 'secretaria' && modo === 'relatorio_final') ||
        (usuario.perfil === 'estagiario' &&
          modo === 'registro_estagiario' &&
          linha.estagiarioId === usuario.id)) &&
      condicaoDaOperacao;

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

  // Consulta sem prontuário para abrir (caso inexistente ou ciclo sem prontuário),
  // feita por um perfil que recebe a resposta vazia: fica no registro de acessos
  // (RNF52), sem prontuário, como as tentativas negadas de prontuário inexistente.
  async registrarSemProntuario(usuario: UsuarioAutenticado, operacao: string) {
    await this.db.insert(acessosProntuario).values({
      prontuarioId: null,
      usuarioId: usuario.id,
      perfil: usuario.perfil,
      operacao,
      permitido: true,
    });
  }
}
