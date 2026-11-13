import {
  hojeEmBrasilia,
  semestreDaData,
  type ConsultaIndicadores,
  type Indicadores,
} from '@clinica/shared';

// Cálculo dos indicadores operacionais (RF48), separado do banco para ser testado
// com datas e casos escolhidos. A consulta (indicadores.service.ts) lê os registros
// numa transação só leitura e passa tudo para cá.

export type VinculoLido = {
  casoId: string;
  vinculadoEm: Date;
  encerradoEm: Date | null;
  // Encerrado por uma transferência (RF25): o caso continua em atendimento ativo
  // até o vínculo seguinte, como diz o RF48.
  encerradoPorTransferencia: boolean;
};
export type AtribuicaoLida = {
  casoId: string;
  supervisorId: string;
  atribuidoEm: Date;
  encerradaEm: Date | null;
};
export type DesligamentoLido = {
  casoId: string;
  decididoEm: Date;
  revertidoEm: Date | null;
};
export type PrimeiraSessaoLida = {
  casoId: string;
  inscritaEm: Date;
  realizadaEm: Date;
};
export type DadosIndicadores = {
  vinculos: VinculoLido[];
  atribuicoes: AtribuicaoLida[];
  desligamentos: DesligamentoLido[];
  primeirasSessoes: PrimeiraSessaoLida[];
  supervisores: { id: string; nome: string }[];
  vagasOfertadas: number | null;
};

type Intervalo = { inicio: Date; fim: Date | null };

// Brasília não tem horário de verão desde 2019: o dia vai das 00:00 às 23:59:59.999
// em -03:00.
export const inicioDoDia = (data: string) => new Date(`${data}T00:00:00-03:00`);
export const fimDoDia = (data: string) =>
  new Date(`${data}T23:59:59.999-03:00`);

const umaCasa = (valor: number) => Math.round(valor * 10) / 10;

// Dias corridos entre duas datas do calendário de Brasília.
const diasCorridos = (de: Date, ate: Date) =>
  (Date.parse(`${hojeEmBrasilia(ate)}T12:00:00Z`) -
    Date.parse(`${hojeEmBrasilia(de)}T12:00:00Z`)) /
  86_400_000;

const vale = (i: Intervalo, t: Date) =>
  i.inicio <= t && (i.fim === null || i.fim > t);
const cruza = (i: Intervalo, de: Date, ate: Date) =>
  i.inicio <= ate && (i.fim === null || i.fim > de);

// Períodos de atendimento ativo de cada caso: os vínculos, com o fim do vínculo
// encerrado por transferência estendido até o início do vínculo seguinte.
export function periodosAtivos(vinculos: VinculoLido[]) {
  const porCaso = new Map<string, VinculoLido[]>();
  for (const v of vinculos) {
    porCaso.set(v.casoId, [...(porCaso.get(v.casoId) ?? []), v]);
  }
  const periodos = new Map<string, Intervalo[]>();
  for (const [casoId, lista] of porCaso) {
    const ordenados = [...lista].sort(
      (a, b) => a.vinculadoEm.getTime() - b.vinculadoEm.getTime(),
    );
    periodos.set(
      casoId,
      ordenados.map((v, i) => ({
        inicio: v.vinculadoEm,
        fim: v.encerradoPorTransferencia
          ? (ordenados[i + 1]?.vinculadoEm ?? null)
          : v.encerradoEm,
      })),
    );
  }
  return periodos;
}

export function calcularIndicadores(
  dados: DadosIndicadores,
  consulta: ConsultaIndicadores,
  agora: Date,
): Indicadores {
  const de = inicioDoDia(consulta.inicio);
  const ate = fimDoDia(consulta.fim);
  const referenciaEhAgora = consulta.fim === hojeEmBrasilia(agora);
  const referencia = referenciaEhAgora ? agora : ate;

  const periodos = periodosAtivos(dados.vinculos);
  const ativosEm = (t: Date) =>
    [...periodos].filter(([, p]) => p.some((i) => vale(i, t))).map(([c]) => c);

  // 1. Vagas ocupadas (posição).
  const ativosNaReferencia = ativosEm(referencia);
  const ocupadas = ativosNaReferencia.length;
  const ofertadas = dados.vagasOfertadas;

  // 2. Tempo médio de espera (fluxo): primeira sessão realizada no intervalo.
  const esperas = dados.primeirasSessoes
    .filter((s) => s.realizadaEm >= de && s.realizadaEm <= ate)
    .map((s) => diasCorridos(s.inscritaEm, s.realizadaEm));
  const mediaDias = esperas.length
    ? umaCasa(esperas.reduce((a, b) => a + b, 0) / esperas.length)
    : 0;

  // 3. Taxa de evasão (fluxo): desligamentos não revertidos no intervalo, sobre os
  // casos em atendimento ativo em pelo menos um dia dele.
  const desligamentos = dados.desligamentos.filter(
    (d) => d.revertidoEm === null && d.decididoEm >= de && d.decididoEm <= ate,
  ).length;
  const ativosNoIntervalo = [...periodos].filter(([, p]) =>
    p.some((i) => cruza(i, de, ate)),
  ).length;
  const evasao = ativosNoIntervalo
    ? umaCasa((desligamentos / ativosNoIntervalo) * 100)
    : 0;

  // 4. Distribuição por supervisor (posição): os casos ativos na referência com a
  // atribuição do supervisor também vigente nela. Todos os supervisores aparecem.
  const ativos = new Set(ativosNaReferencia);
  const contagem = new Map<string, number>();
  for (const a of dados.atribuicoes) {
    if (
      ativos.has(a.casoId) &&
      vale({ inicio: a.atribuidoEm, fim: a.encerradaEm }, referencia)
    ) {
      contagem.set(a.supervisorId, (contagem.get(a.supervisorId) ?? 0) + 1);
    }
  }
  const supervisores = dados.supervisores
    .map((s) => ({ ...s, casos: contagem.get(s.id) ?? 0 }))
    .sort((a, b) => b.casos - a.casos || a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    inicio: consulta.inicio,
    fim: consulta.fim,
    referencia: referencia.toISOString(),
    referenciaEhAgora,
    vagas: {
      ocupadas,
      semestre: semestreDaData(hojeEmBrasilia(referencia)),
      ofertadas,
      percentual: ofertadas ? umaCasa((ocupadas / ofertadas) * 100) : null,
    },
    espera: { mediaDias, pacientes: esperas.length },
    evasao: { percentual: evasao, desligamentos, ativos: ativosNoIntervalo },
    supervisores,
  };
}
