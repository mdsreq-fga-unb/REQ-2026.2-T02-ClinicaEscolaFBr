// Teste de carga do RNF47 na consulta dos indicadores operacionais (RF48): até 10
// pessoas da coordenação consultando ao mesmo tempo, cada uma com um período de 12
// meses, sobre a massa de dois semestres criada por
// apps/api/src/scripts/semear-carga.ts. O RNF47 pede que os indicadores apareçam
// em até 5 segundos, sem falar em percentil; por isso, o limite vale para a
// consulta mais lenta, e não para o percentil 95. A exportação em PDF (RF49), que o
// RNF47 também cobre, entra aqui quando for construída (Ciclo 6).
//
// Uso: k6 run -e API=http://localhost:3333 -e SENHA_CARGA=... scripts/carga/rnf47.js
// Opções: -e USUARIOS=10 -e DURACAO=5m -e RELATORIO=relatorio-testes/carga-rnf47.json
import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API || "http://localhost:3333";
const DOMINIO = "carga.fbr.edu.br";
const USUARIOS = Number(__ENV.USUARIOS || 10);
const DURACAO = __ENV.DURACAO || "5m";
const LIMITE = 5000;

export const options = {
  noCookiesReset: true,
  scenarios: {
    coordenacao: { executor: "constant-vus", vus: USUARIOS, duration: DURACAO },
  },
  thresholds: {
    "http_req_duration{operacao:indicadores}": [`max<${LIMITE}`],
    "http_reqs{operacao:indicadores}": ["count>0"],
    checks: ["rate>0.99"],
  },
};

// Período de 12 meses que termina hoje, em Brasília: o maior que o RNF47 cobre.
function periodo() {
  const hoje = new Date(Date.now() - 3 * 3_600_000);
  const fim = hoje.toISOString().slice(0, 10);
  const inicio = new Date(hoje);
  inicio.setUTCFullYear(inicio.getUTCFullYear() - 1);
  inicio.setUTCDate(inicio.getUTCDate() + 1);
  return { inicio: inicio.toISOString().slice(0, 10), fim };
}

const json = { headers: { "Content-Type": "application/json" } };

// Cada pessoa simulada entra uma vez com uma das 10 contas da coordenação (RF50).
let entrou = false;
function entrar() {
  if (entrou) return;
  sleep(Math.random() * 3);
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({
      email: `coordenacao${((__VU - 1) % 10) + 1}@${DOMINIO}`,
      senha: __ENV.SENHA_CARGA,
    }),
    json,
  );
  check(res, { entrou: (r) => r.status === 200 || r.status === 201 });
  entrou = true;
}

export default function () {
  entrar();
  const { inicio, fim } = periodo();
  const res = http.get(`${API}/indicadores?inicio=${inicio}&fim=${fim}`, {
    tags: { rnf: "RNF47", operacao: "indicadores" },
  });
  check(res, {
    "indicadores do período": (r) =>
      r.status === 200 && r.json("vagas.ocupadas") !== undefined,
  });
  sleep(1 + Math.random() * 2);
}

// Resultado no formato dos relatórios de teste do CI, para o D4.5 do RF48.
export function handleSummary(dados) {
  const metrica = (nome) => dados.metrics[nome];
  const passou = (nome) =>
    Boolean(metrica(nome)) &&
    Object.values(metrica(nome).thresholds ?? {}).every((t) => t.ok);
  const duracao = "http_req_duration{operacao:indicadores}";
  const pedidos = "http_reqs{operacao:indicadores}";
  const ok = passou(duracao) && passou(pedidos) && passou("checks");
  const valores = metrica(duracao)?.values ?? {};
  const n = metrica(pedidos)?.values?.count ?? 0;
  const resumo = [
    "## Teste de carga (RNF47, indicadores operacionais)",
    "",
    "| RNF | Operação | Requisições | Percentil 95 | Mais lenta | Limite | Resultado |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    `| RNF47 | indicadores (12 meses) | ${n} | ${Math.round(valores["p(95)"] ?? NaN)} ms | ${Math.round(valores.max ?? NaN)} ms | ${LIMITE} ms | ${ok ? "✅" : "❌"} |`,
    "",
    `Usuários simultâneos: ${USUARIOS}. Duração: ${DURACAO}. Verificações aprovadas: ${Math.round((metrica("checks")?.values?.rate ?? 0) * 100)}%.`,
    "",
  ].join("\n");
  return {
    stdout: resumo,
    [__ENV.RELATORIO || "relatorio-testes/carga-rnf47.json"]: JSON.stringify({
      testResults: [
        {
          assertionResults: [
            {
              fullName: `Carga: indicadores operacionais de um período de 12 meses com ${USUARIOS} pessoas da coordenação ao mesmo tempo por ${DURACAO}, cada consulta em até ${LIMITE / 1000} s (RF48, RNF47)`,
              status: ok ? "passed" : "failed",
            },
          ],
        },
      ],
    }),
    [__ENV.RESUMO || "relatorio-testes/carga-rnf47.md"]: resumo,
  };
}
