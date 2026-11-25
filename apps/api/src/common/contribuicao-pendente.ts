import { and, asc, eq, inArray, notExists, notInArray, sql } from 'drizzle-orm';
import {
  casos,
  pagamentosContribuicao,
  sessoesAtendimento,
  type Db,
} from '@clinica/database';
import type { Transacao } from '../auditoria/auditoria.service';

type Leitor = Db | Transacao;

// Sem pagamento registrado no ciclo atual do caso (RF41). A situação é calculada
// na leitura, a partir dos pagamentos, para a lista, a agenda e a ficha nunca
// divergirem (RF42).
const semPagamentoNoCicloAtual = (banco: Leitor) =>
  notExists(
    banco
      .select({ um: sql`1` })
      .from(pagamentosContribuicao)
      .where(
        and(
          eq(pagamentosContribuicao.casoId, casos.id),
          eq(pagamentosContribuicao.cicloAtendimento, casos.cicloAtendimento),
        ),
      ),
  );

// Casos, entre os informados, sem o pagamento do ciclo atual (RF42).
export async function casosComContribuicaoPendente(
  banco: Leitor,
  casoIds: string[],
): Promise<Set<string>> {
  if (casoIds.length === 0) return new Set();
  const linhas = await banco
    .select({ id: casos.id })
    .from(casos)
    .where(and(inArray(casos.id, casoIds), semPagamentoNoCicloAtual(banco)));
  return new Set(linhas.map((l) => l.id));
}

// Status que não contam como a 1ª sessão do ciclo (RF42): a cancelada e a falta
// do paciente. Como no RF43, a contribuição só passa a bloquear depois de uma
// sessão realizada; até lá, a próxima sessão ainda é a "1ª".
export const FORA_DA_PRIMEIRA_SESSAO = ['cancelada', 'falta_paciente'] as const;

// A 1ª sessão do ciclo atual de cada caso sem pagamento: a de início mais cedo
// entre as que não foram canceladas nem tiveram falta do paciente (RF42). É nela
// que a agenda avisa da contribuição pendente; a partir da 2ª, o RF43 bloqueia o
// agendamento.
export async function primeirasSessoesComContribuicaoPendente(
  banco: Leitor,
  casoIds: string[],
): Promise<Set<string>> {
  if (casoIds.length === 0) return new Set();
  const linhas = await banco
    .selectDistinctOn([sessoesAtendimento.casoId], {
      id: sessoesAtendimento.id,
    })
    .from(sessoesAtendimento)
    .innerJoin(
      casos,
      and(
        eq(casos.id, sessoesAtendimento.casoId),
        eq(casos.cicloAtendimento, sessoesAtendimento.cicloAtendimento),
      ),
    )
    .where(
      and(
        inArray(sessoesAtendimento.casoId, casoIds),
        notInArray(sessoesAtendimento.status, [...FORA_DA_PRIMEIRA_SESSAO]),
        semPagamentoNoCicloAtual(banco),
      ),
    )
    .orderBy(sessoesAtendimento.casoId, asc(sessoesAtendimento.inicio));
  return new Set(linhas.map((l) => l.id));
}
