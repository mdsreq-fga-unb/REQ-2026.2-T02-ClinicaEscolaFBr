import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import {
  cancelamentosSessao,
  reclassificacoesFalta,
  sessoesAtendimento,
  sinalizacoesReprovacao,
  usuarios,
  type Db,
} from '@clinica/database';
import { LIMITE_FALTAS_ESTAGIARIO, limitesDoSemestre } from '@clinica/shared';
import type { Transacao } from '../../auditoria/auditoria.service';
import { inicioDoDia } from '../agendamento/horario';

// Contagem das faltas do estagiário no semestre (RF40) e a sinalização de
// reprovação que depende dela (RF63). Funções sem estado, usadas na transação do
// registro da ausência (RF16), da reclassificação (RF40) e nas consultas.

// Trava a contagem de faltas do estagiário até o fim da transação (apontamento 3
// da inspeção do RF40). Duas ausências do mesmo estagiário registradas ao mesmo
// tempo, em sessões diferentes, travam sessões diferentes; sem esta trava, cada
// transação contaria sem ver a outra, e a 3ª falta passaria sem a sinalização de
// reprovação (RF63). O `no key update` não segura as inserções que só apontam
// para o usuário, como a auditoria.
export async function travarFaltasDoEstagiario(
  tx: Transacao,
  estagiarioId: string,
) {
  await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, estagiarioId))
    .for('no key update');
}

// Faltas do estagiário que contam: ausências reais (RF16) sem reclassificação,
// numa sessão do semestre, pela data da sessão em Brasília.
export async function contarFaltasNoSemestre(
  banco: Db | Transacao,
  estagiarioId: string,
  semestre: string,
) {
  const { inicio, fimExclusivo } = limitesDoSemestre(semestre);
  const [{ total }] = await banco
    .select({ total: sql<number>`count(*)::int` })
    .from(cancelamentosSessao)
    .innerJoin(
      sessoesAtendimento,
      eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
    )
    .leftJoin(
      reclassificacoesFalta,
      eq(reclassificacoesFalta.cancelamentoId, cancelamentosSessao.id),
    )
    .where(
      and(
        eq(cancelamentosSessao.classificacao, 'ausencia_estagiario'),
        isNull(reclassificacoesFalta.id),
        eq(sessoesAtendimento.estagiarioId, estagiarioId),
        gte(sessoesAtendimento.inicio, inicioDoDia(inicio)),
        lt(sessoesAtendimento.inicio, inicioDoDia(fimExclusivo)),
      ),
    );
  return total;
}

// Reavalia a sinalização de reprovação do estagiário no semestre (RF63), depois de
// a contagem mudar, na mesma transação e depois da trava do estagiário. Devolve a
// contagem atual.
// - Gera a sinalização quando a contagem chega ao limite e, no semestre, não há
//   uma aberta nem uma encerrada pela decisão da coordenação (apontamento 1 da
//   inspeção): depois da decisão (RF64), cabe à coordenação registrar outra.
// - Encerra a aberta, sem decisão, quando uma reclassificação deixa a contagem
//   abaixo do limite, e guarda a reclassificação. Voltando ao limite, gera outra.
// - Com a decisão registrada, não mexe em nada: a contagem atual aparece na
//   consulta.
// O `on conflict do nothing` no índice único da sinalização aberta (apontamento 3
// da inspeção) garante que uma corrida nunca derrube a transação do RF16, e com ela
// o registro da ausência.
export async function reavaliarSinalizacao(
  tx: Transacao,
  estagiarioId: string,
  semestre: string,
  reclassificacaoId?: string,
) {
  const faltas = await contarFaltasNoSemestre(tx, estagiarioId, semestre);
  const doSemestre = await tx
    .select({
      id: sinalizacoesReprovacao.id,
      encerradaEm: sinalizacoesReprovacao.encerradaEm,
      motivo: sinalizacoesReprovacao.motivoEncerramento,
    })
    .from(sinalizacoesReprovacao)
    .where(
      and(
        eq(sinalizacoesReprovacao.estagiarioId, estagiarioId),
        eq(sinalizacoesReprovacao.semestre, semestre),
      ),
    );
  const aberta = doSemestre.find((s) => !s.encerradaEm);
  const decidida = doSemestre.some((s) => s.motivo === 'decisao');

  if (faltas >= LIMITE_FALTAS_ESTAGIARIO && !aberta && !decidida) {
    await tx
      .insert(sinalizacoesReprovacao)
      .values({ estagiarioId, semestre })
      .onConflictDoNothing();
  } else if (faltas < LIMITE_FALTAS_ESTAGIARIO && aberta && reclassificacaoId) {
    await tx
      .update(sinalizacoesReprovacao)
      .set({
        encerradaEm: sql`now()`,
        motivoEncerramento: 'contagem_abaixo_do_limite',
        reclassificacaoId,
      })
      .where(
        and(
          eq(sinalizacoesReprovacao.id, aberta.id),
          isNull(sinalizacoesReprovacao.encerradaEm),
        ),
      );
  }
  return faltas;
}
