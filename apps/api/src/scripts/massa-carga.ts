import {
  casos,
  decisoesPrioridade,
  inscricoes,
  usuarios,
  type Db,
} from '@clinica/database';
import { and, eq, like, sql } from 'drizzle-orm';
import { cifrar } from '../common/criptografia';

// Massa de dados fictícia do teste de carga (RNF12, RNF21 e RNF47): o domínio das
// contas e dos pacientes, as inscrições e a reposição dos casos que aguardam
// distribuição. Usado pelo semear-carga.

export const DOMINIO = 'carga.fbr.edu.br';
export const AGUARDANDO_DISTRIBUICAO = 160;
export const CORES = ['vermelha', 'amarela', 'verde'] as const;

// Contas usadas pelo teste de carga, com a senha de SENHA_CARGA.
// Uma conta por pessoa simulada: 30 pessoas da equipe, cada uma com a sua.
export const CONTAS_DA_CARGA = {
  coordenacao: (n: number) => `coordenacao${n}@${DOMINIO}`,
  secretaria: (n: number) => `secretaria${n}@${DOMINIO}`,
  supervisor: (n: number) => `supervisor${n}@${DOMINIO}`,
  estagiario: (n: number) => `estagiario${n}@${DOMINIO}`,
};

// Inscrição fictícia número `i` da massa (a partir de 0), criada em `criadaEm`.
export function inscricaoDaCarga(i: number, chave: string, criadaEm: Date) {
  return {
    numero: sql`'2026-' || lpad(nextval('inscricoes_numero_seq')::text, 5, '0')`,
    nomeCompleto: `Paciente Carga ${i + 1}`,
    dataNascimento: '1990-01-01',
    cpf: String(90_000_000_000 + i),
    rg: String(1_000_000 + i),
    endereco: 'Rua Fictícia, 1, Brasília DF',
    estadoCivil: 'Solteiro(a)',
    canalPreferencial: 'email' as const,
    email: `paciente${i + 1}@${DOMINIO}`,
    queixaCifrada: cifrar(`Queixa fictícia ${i + 1}`, chave),
    percepcaoUrgenciaCifrada: cifrar('Urgência fictícia', chave),
    historicoRelevanteCifrado: cifrar('Histórico fictício', chave),
    criadaEm,
  };
}

// Repõe os casos aguardando distribuição da massa até os 160 do cenário de
// referência. Os novos entram na fila agora, depois dos que já esperavam.
export async function reporPendentes(db: Db, chave: string) {
  await db.transaction(async (tx) => {
    const daCarga = like(inscricoes.email, `%@${DOMINIO}`);
    const [{ pendentes }] = await tx
      .select({ pendentes: sql<number>`count(*)::int` })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(and(eq(casos.situacao, 'aguardando_distribuicao'), daCarga));
    const faltam = AGUARDANDO_DISTRIBUICAO - pendentes;
    if (faltam <= 0) {
      console.log(
        `A massa já tem ${pendentes} casos aguardando distribuição: nada a repor.`,
      );
      return;
    }
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(inscricoes)
      .where(daCarga);
    const [coordenacao] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, CONTAS_DA_CARGA.coordenacao(1)));
    const agora = Date.now();
    const novas = await tx
      .insert(inscricoes)
      .values(
        Array.from({ length: faltam }, (_, k) =>
          inscricaoDaCarga(
            total + k,
            chave,
            new Date(agora - (faltam - k) * 60_000),
          ),
        ),
      )
      .returning({ id: inscricoes.id, criadaEm: inscricoes.criadaEm });
    await tx.insert(decisoesPrioridade).values(
      novas.map((n, k) => ({
        inscricaoId: n.id,
        corCifrada: cifrar(CORES[(total + k) % CORES.length], chave),
        decididaPor: coordenacao.id,
      })),
    );
    await tx.insert(casos).values(
      novas.map((n) => ({
        inscricaoId: n.id,
        entradaNaFilaEm: n.criadaEm,
        situacao: 'aguardando_distribuicao' as const,
      })),
    );
    console.log(
      `Repostos ${faltam} casos aguardando distribuição (agora são ${AGUARDANDO_DISTRIBUICAO}).`,
    );
  });
}
