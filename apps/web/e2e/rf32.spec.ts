import { randomUUID, randomBytes, createCipheriv } from "node:crypto";
import {
  createDb,
  inscricoes,
  casos,
  prontuarios,
  vinculosEstagiario,
  atribuicoesSupervisor,
  sessoesAtendimento,
  evolucoes,
  complementosEvolucao,
  validacoesEvolucao,
} from "@clinica/database";
import { expect, test } from "@playwright/test";
import { entrar, fecharContextos, semViolacoes } from "./apoio";
import { EQUIPE } from "./equipe";
test.afterEach(fecharContextos);
test.describe.configure({ mode: "serial" });
function cifrar(texto: string) {
  const iv = randomBytes(12);
  const cifra = createCipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.CHAVE_DADOS!, "base64"),
    iv,
  );
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cifra.getAuthTag().toString("base64"),
    conteudo.toString("base64"),
  ].join(".");
}
async function preparar() {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !url.pathname.startsWith("/clinica_rf1_test_")
  )
    throw new Error("RF32 exige banco local descartável.");
  const db = createDb(url.href);
  try {
    const usuario = async (perfil: keyof typeof EQUIPE) =>
      (
        await db.$client.query<{ id: string }>(
          "select id from usuarios where email=$1",
          [EQUIPE[perfil].email],
        )
      ).rows[0].id;
    const estagiario = await usuario("estagiario"),
      supervisor = await usuario("supervisor"),
      coordenacao = await usuario("coordenacao");
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero: `rf32-${randomUUID()}`,
        nomeCompleto: "Paciente fictício RF32",
        cpf: "52998224725",
        dataNascimento: "1990-01-01",
        endereco: "Rua fictícia",
        estadoCivil: "solteiro",
        canalPreferencial: "email",
        email: "rf32@example.test",
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({
        inscricaoId: i.id,
        entradaNaFilaEm: i.criadaEm,
        situacao: "em_atendimento",
        cicloAtendimento: 2,
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: c.id,
      supervisorId: supervisor,
      atribuidoPor: coordenacao,
    });
    const [v] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId: c.id,
        estagiarioId: estagiario,
        vinculadoPor: supervisor,
      })
      .returning();
    const ps = await db
      .insert(prontuarios)
      .values(
        [1, 2].map((ciclo) => ({
          casoId: c.id,
          cicloAtendimento: ciclo,
          vinculoOrigemId: v.id,
        })),
      )
      .returning();
    const inicio = (
      await db.$client.query<{ inicio: Date }>(
        "select coalesce(max(inicio), timestamptz '2026-02-09 13:00:00+00') + interval '1 day' as inicio from sessoes_atendimento where estagiario_id = $1",
        [estagiario],
      )
    ).rows[0].inicio;
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: c.id,
        estagiarioId: estagiario,
        agendadaPor: estagiario,
        cicloAtendimento: 1,
        inicio,
        termino: new Date(+inicio + 3000000),
        fimIntervaloAnotacoes: new Date(+inicio + 3600000),
        status: "realizada",
      })
      .returning();
    const [e] = await db
      .insert(evolucoes)
      .values({
        prontuarioId: ps[0].id,
        sessaoId: s.id,
        registradaPor: estagiario,
        queixaCifrada: cifrar("Original fictício preservado RF32"),
        planejamentoCifrado: cifrar("Planejamento fictício"),
      })
      .returning();
    await db.insert(complementosEvolucao).values({
      evolucaoId: e.id,
      textoCifrado: cifrar("Complemento fictício RF32"),
      registradoPor: estagiario,
      registradoEm: new Date(+e.registradaEm + 1000),
    });
    await db.insert(validacoesEvolucao).values({
      evolucaoId: e.id,
      validadaPor: supervisor,
      validadaEm: new Date(+e.registradaEm + 2000),
    });
    return ps[1].id;
  } finally {
    await db.$client.end();
  }
}
for (const largura of [1280, 390]) {
  test(`RF32: consulta ciclo anterior, expansão e ciclo vazio, ${largura}px`, async ({
    browser,
  }) => {
    const id = await preparar();
    const page = await entrar(browser, "coordenacao");
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto(`/prontuarios/${id}#historico-evolucoes`);
    const historico = page.locator("#historico-evolucoes");
    await expect(
      historico.getByText("Ainda não há evoluções registradas neste ciclo."),
    ).toBeVisible();
    await historico.getByLabel("Ciclo de atendimento").selectOption("1");
    await expect(
      historico.getByRole("heading", { name: "Evoluções do ciclo 1" }),
    ).toBeVisible();
    await historico.locator("summary:visible").click();
    await expect(
      historico
        .getByText("Original fictício preservado RF32")
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      historico
        .getByText("Complemento fictício RF32")
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      historico
        .getByText("Validada", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      historico.getByText(/Última validação:/).filter({ visible: true }),
    ).toBeVisible();
    await semViolacoes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await historico.getByLabel("Ciclo de atendimento").selectOption("2");
    await expect(
      historico.getByText("Ainda não há evoluções registradas neste ciclo."),
    ).toBeVisible();
    await expect(
      historico.getByText("Original fictício preservado RF32"),
    ).toHaveCount(0);
  });
}
