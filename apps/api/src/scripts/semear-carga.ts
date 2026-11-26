import {
  atribuicoesSupervisor,
  casos,
  createDb,
  decisoesPrioridade,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
} from '@clinica/database';
import { inArray, like, sql } from 'drizzle-orm';
import { cifrar } from '../common/criptografia';
import { gerarHashSenha } from '../modules/acesso/credenciais';
import {
  AGUARDANDO_DISTRIBUICAO,
  CONTAS_DA_CARGA,
  CORES,
  DOMINIO,
  inscricaoDaCarga,
  reporPendentes,
} from './massa-carga';

// Massa de dados fictícia do cenário de referência do RNF12 e do RNF21: dois
// semestres de operação, com 360 inscrições, 200 pacientes em atendimento e
// 4.000 sessões registradas, e as contas da equipe usadas no teste de carga
// (scripts/carga). Só para homologação e testes: recusa NODE_ENV=production e
// exige AMBIENTE_DE_TESTE=sim.
//
// Uso (de apps/api, depois do build):
//   AMBIENTE_DE_TESTE=sim DATABASE_URL=... CHAVE_DADOS=... SENHA_CARGA=... \
//   node dist/scripts/semear-carga.js
//
// As gravações da carga (distribuir e vincular) consomem os casos que aguardam
// distribuição. Com a massa já criada, REPOR_PENDENTES=sim cria só inscrições
// novas, com prioridade e caso aguardando distribuição, até voltar aos 160, sem
// mexer no que já existe. Nesse modo, a SENHA_CARGA não é usada:
//   AMBIENTE_DE_TESTE=sim REPOR_PENDENTES=sim DATABASE_URL=... CHAVE_DADOS=... \
//   node dist/scripts/semear-carga.js

const COORDENACOES = 10;
const SECRETARIAS = 10;
const SUPERVISORES = 10;
const ESTAGIARIOS = 20;
const PACIENTES_EM_ATENDIMENTO = 200;
const SESSOES = 4000;

async function principal() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('A massa de carga não pode ser criada em produção.');
  }
  if (process.env.AMBIENTE_DE_TESTE !== 'sim') {
    throw new Error(
      'Confirme que o banco é de homologação ou de teste com AMBIENTE_DE_TESTE=sim.',
    );
  }
  const repor = process.env.REPOR_PENDENTES === 'sim';
  const faltando = [
    'DATABASE_URL',
    'CHAVE_DADOS',
    ...(repor ? [] : ['SENHA_CARGA']),
  ].filter((nome) => !process.env[nome]);
  if (faltando.length) throw new Error(`Informe ${faltando.join(', ')}.`);
  const chave = process.env.CHAVE_DADOS!;
  const db = createDb(process.env.DATABASE_URL!);

  try {
    const existentes = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(like(usuarios.email, `%@${DOMINIO}`));
    if (existentes.length) {
      if (repor) await reporPendentes(db, chave);
      else
        console.log(
          'A massa de carga já existe neste banco. Para repor os casos aguardando distribuição, use REPOR_PENDENTES=sim.',
        );
      return;
    }
    if (repor) {
      console.log(
        'Ainda não há massa de carga neste banco: rode sem REPOR_PENDENTES para criá-la.',
      );
      return;
    }

    await db.transaction(async (tx) => {
      const senhaHash = await gerarHashSenha(process.env.SENHA_CARGA!);
      const conta = (
        nome: string,
        email: string,
        perfil: 'coordenacao' | 'secretaria' | 'supervisor' | 'estagiario',
      ) => ({ nome, email, perfil, situacao: 'ativo' as const, senhaHash });
      const equipe = await tx
        .insert(usuarios)
        .values([
          ...Array.from({ length: COORDENACOES }, (_, i) =>
            conta(
              `Coordenação Carga ${i + 1}`,
              CONTAS_DA_CARGA.coordenacao(i + 1),
              'coordenacao',
            ),
          ),
          ...Array.from({ length: SECRETARIAS }, (_, i) =>
            conta(
              `Secretaria Carga ${i + 1}`,
              CONTAS_DA_CARGA.secretaria(i + 1),
              'secretaria',
            ),
          ),
          ...Array.from({ length: SUPERVISORES }, (_, i) =>
            conta(
              `Supervisor Carga ${i + 1}`,
              CONTAS_DA_CARGA.supervisor(i + 1),
              'supervisor',
            ),
          ),
          ...Array.from({ length: ESTAGIARIOS }, (_, i) =>
            conta(
              `Estagiário Carga ${i + 1}`,
              CONTAS_DA_CARGA.estagiario(i + 1),
              'estagiario',
            ),
          ),
        ])
        .returning();
      const coordenacao = equipe.find((u) => u.perfil === 'coordenacao')!;
      const secretaria = equipe.find((u) => u.perfil === 'secretaria')!;
      const supervisores = equipe.filter((u) => u.perfil === 'supervisor');
      const estagiarios = equipe.filter((u) => u.perfil === 'estagiario');

      // 360 inscrições ao longo de dois semestres, todas com prioridade e caso.
      const total = PACIENTES_EM_ATENDIMENTO + AGUARDANDO_DISTRIBUICAO;
      const inicio = new Date('2026-02-02T12:00:00-03:00').getTime();
      const novas = await tx
        .insert(inscricoes)
        .values(
          Array.from({ length: total }, (_, i) =>
            inscricaoDaCarga(i, chave, new Date(inicio + i * 12 * 3_600_000)),
          ),
        )
        .returning({ id: inscricoes.id, criadaEm: inscricoes.criadaEm });
      await tx.insert(decisoesPrioridade).values(
        novas.map((n, i) => ({
          inscricaoId: n.id,
          corCifrada: cifrar(CORES[i % CORES.length], chave),
          decididaPor: coordenacao.id,
        })),
      );

      // Os 200 primeiros estão em atendimento; os outros aguardam a distribuição.
      const novosCasos = await tx
        .insert(casos)
        .values(
          novas.map((n, i) => ({
            inscricaoId: n.id,
            entradaNaFilaEm: n.criadaEm,
            situacao:
              i < PACIENTES_EM_ATENDIMENTO
                ? ('em_atendimento' as const)
                : ('aguardando_distribuicao' as const),
          })),
        )
        .returning({ id: casos.id });
      const emAtendimento = novosCasos.slice(0, PACIENTES_EM_ATENDIMENTO);
      await tx.insert(atribuicoesSupervisor).values(
        emAtendimento.map((c, i) => ({
          casoId: c.id,
          supervisorId: supervisores[i % SUPERVISORES].id,
          atribuidoPor: coordenacao.id,
        })),
      );
      const vinculos = await tx
        .insert(vinculosEstagiario)
        .values(
          emAtendimento.map((c, i) => ({
            casoId: c.id,
            estagiarioId: estagiarios[i % ESTAGIARIOS].id,
            vinculadoPor: supervisores[i % SUPERVISORES].id,
          })),
        )
        .returning();
      await tx.insert(prontuarios).values(
        vinculos.map((v) => ({
          casoId: v.casoId,
          cicloAtendimento: 1,
          vinculoOrigemId: v.id,
        })),
      );

      // 4.000 sessões realizadas, 200 por estagiário, uma por hora nos dias
      // úteis, sem sobreposição: cada paciente só tem sessões com o seu estagiário.
      const sessoes: (typeof sessoesAtendimento.$inferInsert)[] = [];
      for (const [e, estagiario] of estagiarios.entries()) {
        const pacientes = vinculos.filter((_, i) => i % ESTAGIARIOS === e);
        const dia = new Date('2026-02-02T08:00:00-03:00');
        let hora = 0;
        for (let s = 0; s < SESSOES / ESTAGIARIOS; s++) {
          if (hora === 10) {
            hora = 0;
            do dia.setUTCDate(dia.getUTCDate() + 1);
            while ([0, 6].includes(dia.getUTCDay()));
          }
          const comeco = new Date(dia.getTime() + hora * 3_600_000);
          hora += 1;
          sessoes.push({
            casoId: pacientes[s % pacientes.length].casoId,
            estagiarioId: estagiario.id,
            inicio: comeco,
            termino: new Date(comeco.getTime() + 50 * 60_000),
            fimIntervaloAnotacoes: new Date(comeco.getTime() + 60 * 60_000),
            status: 'realizada',
            agendadaPor: secretaria.id,
          });
        }
      }
      for (let i = 0; i < sessoes.length; i += 500) {
        await tx.insert(sessoesAtendimento).values(sessoes.slice(i, i + 500));
      }
    });

    const contagem = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(inscricoes)
      .where(
        inArray(
          inscricoes.email,
          Array.from(
            { length: PACIENTES_EM_ATENDIMENTO + AGUARDANDO_DISTRIBUICAO },
            (_, i) => `paciente${i + 1}@${DOMINIO}`,
          ),
        ),
      );
    console.log(
      `Massa de carga criada: ${contagem[0].n} inscrições, ${PACIENTES_EM_ATENDIMENTO} pacientes em atendimento e ${SESSOES} sessões.`,
    );
  } finally {
    await db.$client.end();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
