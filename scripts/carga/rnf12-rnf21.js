// Teste de carga do cenário de referência do RNF12 e do RNF21: 30 pessoas da
// equipe usando o sistema ao mesmo tempo por 10 minutos, sobre a massa de dois
// semestres criada por apps/api/src/scripts/semear-carga.ts. Mede o percentil
// 95 do tempo de resposta de cada operação, com o limite do seu RNF:
//   RNF12 (até 2 s): agendar sessão (RF10). Remarcar, confirmar e cancelar
//     entram quando forem construídos (Ciclo 4).
//   RNF21 (até 3 s): listar casos, distribuir (RF18, RF20) e vincular (RF21).
//     A consulta de responsáveis (RF22) entra quando for construída.
//
// Uso: k6 run -e API=http://localhost:3333 -e SENHA_CARGA=... scripts/carga/rnf12-rnf21.js
// Opções: -e USUARIOS=30 -e DURACAO=10m -e RELATORIO=relatorio-testes/carga.json
import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API || "http://localhost:3333";
const DOMINIO = "carga.fbr.edu.br";
// Cada pessoa simulada usa a sua conta (semear-carga cria 10 de cada papel).
const conta = (papel) => `${papel}${1 + Math.floor((__VU - 1) / 3)}@${DOMINIO}`;

const USUARIOS = Number(__ENV.USUARIOS || 30);
const DURACAO = __ENV.DURACAO || "10m";

// Operações medidas, com o limite do percentil 95 do RNF de cada uma. O RNF só
// passa se todas as operações dele passarem e tiverem acontecido.
const RNFS = {
  RNF12: {
    limite: 2000,
    rfs: "RF10",
    descricao: "busca de paciente e agendamento",
    operacoes: ["buscar_paciente", "agendar"],
  },
  RNF21: {
    limite: 3000,
    rfs: "RF18, RF20, RF21",
    descricao: "listagens de casos, distribuição e vínculo",
    operacoes: [
      "listar_pendentes",
      "disponibilidade",
      "distribuir",
      "meus_casos",
      "estagiarios_disponiveis",
      "vincular",
    ],
  },
};

const limites = {};
for (const { limite, operacoes } of Object.values(RNFS)) {
  for (const operacao of operacoes) {
    limites[`http_req_duration{operacao:${operacao}}`] = [`p(95)<${limite}`];
    limites[`http_reqs{operacao:${operacao}}`] = ["count>0"];
  }
}

export const options = {
  // Cada pessoa simulada entra uma vez e mantém a sessão, como no uso real.
  noCookiesReset: true,
  scenarios: {
    equipe: { executor: "constant-vus", vus: USUARIOS, duration: DURACAO },
  },
  thresholds: { ...limites, checks: ["rate>0.99"] },
};

// "10m", "90s" ou "1m30s" em segundos.
const segundos = (texto) =>
  [...texto.matchAll(/(\d+)(h|m|s)/g)].reduce(
    (total, [, n, u]) => total + Number(n) * { h: 3600, m: 60, s: 1 }[u],
    0,
  );

// Ritmo das gravações: os 160 casos pendentes da massa são distribuídos aos
// poucos, para a fila durar a carga inteira, e os vínculos seguem o mesmo ritmo.
// Cada pessoa da coordenação (e cada supervisor) grava no máximo uma vez por
// intervalo, começando num momento diferente das outras.
const POR_PAPEL = Math.ceil(USUARIOS / 3);
const INTERVALO_GRAVACAO = (segundos(DURACAO) * 1000 * POR_PAPEL) / 150;
let proximaGravacao = null;
function podeGravar() {
  const agora = Date.now();
  if (proximaGravacao === null) {
    proximaGravacao = agora + Math.random() * INTERVALO_GRAVACAO;
  }
  if (agora < proximaGravacao) return false;
  proximaGravacao += INTERVALO_GRAVACAO;
  return true;
}

const json = { headers: { "Content-Type": "application/json" } };
const medir = (rnf, operacao) => ({ ...json, tags: { rnf, operacao } });

// Cada pessoa simulada entra uma vez com a conta do seu perfil (RF50).
let entrou = false;
function entrar(email) {
  if (entrou) return;
  // Em momentos diferentes, como uma equipe chegando ao trabalho.
  sleep(Math.random() * 5);
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email, senha: __ENV.SENHA_CARGA }),
    json,
  );
  check(res, { entrou: (r) => r.status === 200 || r.status === 201 });
  entrou = true;
}

// A coordenação lista os casos pendentes e distribui um (RF18, RF20).
function coordenacao() {
  entrar(conta("coordenacao"));
  const lista = http.get(
    `${API}/casos/aguardando-distribuicao`,
    medir("RNF21", "listar_pendentes"),
  );
  check(lista, { "lista de pendentes": (r) => r.status === 200 });
  const disponiveis = http.get(
    `${API}/supervisores/disponibilidade`,
    medir("RNF21", "disponibilidade"),
  );
  const casos = lista.status === 200 ? lista.json() : [];
  const livres =
    disponiveis.status === 200
      ? disponiveis.json().filter((s) => !s.noLimite)
      : [];
  if (casos.length && livres.length && podeGravar()) {
    const caso = casos[Math.floor(Math.random() * casos.length)];
    const supervisor = livres[Math.floor(Math.random() * livres.length)];
    const res = http.post(
      `${API}/casos/${caso.casoId}/supervisor`,
      JSON.stringify({ supervisorId: supervisor.id }),
      medir("RNF21", "distribuir"),
    );
    // 409: outra pessoa simulada distribuiu o mesmo caso antes, como na vida real.
    check(res, { distribuiu: (r) => [201, 409].includes(r.status) });
  }
}

// O supervisor vê os seus casos e vincula um estagiário aos que não têm (RF21).
function supervisor() {
  entrar(conta("supervisor"));
  const meus = http.get(`${API}/casos/meus`, medir("RNF21", "meus_casos"));
  check(meus, { "meus casos": (r) => r.status === 200 });
  const semEstagiario =
    meus.status === 200 ? meus.json().filter((c) => !c.estagiario) : [];
  if (semEstagiario.length && podeGravar()) {
    const opcoes = http.get(
      `${API}/estagiarios/disponiveis`,
      medir("RNF21", "estagiarios_disponiveis"),
    );
    const lista = opcoes.status === 200 ? opcoes.json() : [];
    if (lista.length) {
      const res = http.post(
        `${API}/casos/${semEstagiario[0].casoId}/estagiario`,
        JSON.stringify({
          estagiarioId: lista[Math.floor(Math.random() * lista.length)].id,
        }),
        medir("RNF21", "vincular"),
      );
      check(res, { vinculou: (r) => [201, 409].includes(r.status) });
    }
  }
}

// A secretaria busca o paciente e agenda a sessão (RF10), num horário só desta
// pessoa simulada e desta repetição, para não haver conflito entre elas.
function secretaria() {
  entrar(conta("secretaria"));
  const busca = http.get(
    `${API}/sessoes/pacientes?busca=Paciente%20Carga`,
    medir("RNF12", "buscar_paciente"),
  );
  check(busca, { "busca de pacientes": (r) => r.status === 200 });
  const pacientes =
    busca.status === 200 ? busca.json().filter((p) => p.estagiario) : [];
  if (!pacientes.length) return;
  const paciente = pacientes[(__VU * 7 + __ITER) % pacientes.length];
  const dia = new Date(Date.UTC(2027, 0, 4));
  dia.setUTCDate(dia.getUTCDate() + __VU * 500 + __ITER);
  const res = http.post(
    `${API}/sessoes`,
    JSON.stringify({
      casoId: paciente.casoId,
      inicio: `${dia.toISOString().slice(0, 10)}T10:00:00-03:00`,
    }),
    medir("RNF12", "agendar"),
  );
  // 409: o estagiário já tem sessão nesse horário, marcada por outra pessoa simulada.
  check(res, { agendou: (r) => [201, 409].includes(r.status) });
}

// Cerca de um terço das pessoas em cada papel, como no pico estimado pela equipe.
export default function () {
  const papel = (__VU - 1) % 3;
  if (papel === 0) coordenacao();
  else if (papel === 1) supervisor();
  else secretaria();
  sleep(1 + Math.random() * 2);
}

// Resultado no formato dos relatórios de teste do CI, para o D4.5 das features.
export function handleSummary(dados) {
  const metrica = (nome) => dados.metrics[nome];
  const passou = (nome) =>
    Boolean(metrica(nome)) &&
    Object.values(metrica(nome).thresholds ?? {}).every((t) => t.ok);
  // Respostas de erro rápidas entram no percentil 95 e o puxam para baixo: o RNF
  // só conta como verificado se as respostas também estiverem certas (checks).
  const respostasCertas = passou("checks");
  const linhas = [];
  const assertionResults = [];
  for (const [rnf, { limite, rfs, descricao, operacoes }] of Object.entries(
    RNFS,
  )) {
    let todas = true;
    for (const operacao of operacoes) {
      const duracao = `http_req_duration{operacao:${operacao}}`;
      const pedidos = `http_reqs{operacao:${operacao}}`;
      const ok = passou(duracao) && passou(pedidos);
      todas &&= ok;
      const p95 = Math.round(metrica(duracao)?.values?.["p(95)"] ?? NaN);
      const n = metrica(pedidos)?.values?.count ?? 0;
      linhas.push(
        `| ${rnf} | ${operacao} | ${n} | ${p95} ms | ${limite} ms | ${ok ? "✅" : "❌"} |`,
      );
    }
    assertionResults.push({
      fullName: `Carga: ${descricao} com ${USUARIOS} usuários simultâneos por ${DURACAO}, cada operação em até ${limite / 1000} s no percentil 95 (${rfs}, ${rnf})`,
      status: todas && respostasCertas ? "passed" : "failed",
    });
  }
  const resumo = [
    "## Teste de carga (RNF12 e RNF21)",
    "",
    "| RNF | Operação | Requisições | Percentil 95 | Limite | Resultado |",
    "| --- | --- | --- | --- | --- | --- |",
    ...linhas,
    "",
    `Usuários simultâneos: ${USUARIOS}. Duração: ${DURACAO}. Requisições: ${metrica("http_reqs")?.values?.count ?? 0}. Verificações aprovadas: ${Math.round((metrica("checks")?.values?.rate ?? 0) * 100)}% ${respostasCertas ? "✅" : "❌ (mínimo de 99%; sem isso, nenhum RNF conta como verificado)"}.`,
    "",
  ].join("\n");
  return {
    stdout: resumo,
    [__ENV.RELATORIO || "relatorio-testes/carga.json"]: JSON.stringify({
      testResults: [{ assertionResults }],
    }),
    [__ENV.RESUMO || "relatorio-testes/carga.md"]: resumo,
  };
}
