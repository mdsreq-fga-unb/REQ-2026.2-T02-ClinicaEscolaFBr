// Teste de carga do cenário de referência do RNF12 e do RNF21: 30 pessoas da
// equipe usando o sistema ao mesmo tempo por 10 minutos, sobre a massa de dois
// semestres criada por apps/api/src/scripts/semear-carga.ts. Mede o percentil
// 95 do tempo de resposta de cada grupo de operações:
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

export const options = {
  // Cada pessoa simulada entra uma vez e mantém a sessão, como no uso real.
  noCookiesReset: true,
  scenarios: {
    equipe: {
      executor: "constant-vus",
      vus: Number(__ENV.USUARIOS || 30),
      duration: __ENV.DURACAO || "10m",
    },
  },
  thresholds: {
    "http_req_duration{rnf:RNF12}": ["p(95)<2000"],
    "http_req_duration{rnf:RNF21}": ["p(95)<3000"],
    checks: ["rate>0.99"],
  },
};

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
  if (casos.length && livres.length) {
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
  if (semEstagiario.length) {
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
  const limite = (metrica) =>
    Object.values(dados.metrics[metrica]?.thresholds ?? {}).every((t) => t.ok);
  const p95 = (metrica) =>
    Math.round(dados.metrics[metrica]?.values?.["p(95)"] ?? NaN);
  const usuarios = Number(__ENV.USUARIOS || 30);
  const resultado = {
    testResults: [
      {
        assertionResults: [
          {
            fullName: `Carga: agendamento com ${usuarios} usuários simultâneos em até 2 s no percentil 95 (RF10, RNF12)`,
            status: limite("http_req_duration{rnf:RNF12}")
              ? "passed"
              : "failed",
          },
          {
            fullName: `Carga: listagens de casos, distribuição e vínculo com ${usuarios} usuários simultâneos em até 3 s no percentil 95 (RF18, RF20, RF21, RNF21)`,
            status: limite("http_req_duration{rnf:RNF21}")
              ? "passed"
              : "failed",
          },
        ],
      },
    ],
  };
  const resumo = [
    `## Teste de carga (RNF12 e RNF21)`,
    "",
    `| Grupo | Percentil 95 | Limite | Resultado |`,
    `| --- | --- | --- | --- |`,
    `| RNF12 (agendamento) | ${p95("http_req_duration{rnf:RNF12}")} ms | 2000 ms | ${limite("http_req_duration{rnf:RNF12}") ? "✅" : "❌"} |`,
    `| RNF21 (listagens, distribuição e vínculo) | ${p95("http_req_duration{rnf:RNF21}")} ms | 3000 ms | ${limite("http_req_duration{rnf:RNF21}") ? "✅" : "❌"} |`,
    "",
    `Usuários simultâneos: ${usuarios}. Requisições: ${dados.metrics.http_reqs?.values?.count ?? 0}. Verificações aprovadas: ${Math.round((dados.metrics.checks?.values?.rate ?? 0) * 100)}%.`,
    "",
  ].join("\n");
  return {
    stdout: resumo,
    [__ENV.RELATORIO || "relatorio-testes/carga.json"]:
      JSON.stringify(resultado),
    [__ENV.RESUMO || "relatorio-testes/carga.md"]: resumo,
  };
}
