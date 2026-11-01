import type { Page } from "@playwright/test";

// Preenchimento do formulário público de inscrição (RF1) com dados fictícios.
export async function preencherDados(page: Page, menor = false) {
  await page.locator("#nomeCompleto").fill("Pessoa Fictícia E2E");
  await page
    .locator("#dataNascimento")
    .fill(menor ? "2020-01-01" : "1994-08-22");
  await page.locator("#cpf").fill("11144477735");
  await page.locator("#rg").fill("MG-12.345.678 SSP/MG");
  await page.locator("#endereco").fill("Rua Fictícia, 10, Brasília DF");
  await page.locator("#estadoCivil").selectOption("Solteiro(a)");
  if (menor) {
    await page.locator("#celular").fill("61999999999");
    await page.locator("#canalPreferencial").selectOption("whatsapp");
  } else {
    await page.locator("#email").fill("ficticio@example.com");
    await page.locator("#canalPreferencial").selectOption("email");
  }
}
export async function preencherTriagem(page: Page) {
  await page
    .locator("#queixa")
    .fill("Declaração clínica fictícia sigilosa E2E");
  await page
    .locator("#percepcaoUrgencia")
    .fill("Urgência fictícia sigilosa E2E");
  await page
    .locator("#historicoRelevante")
    .fill("Histórico fictício sigiloso E2E");
}
export const continuar = (page: Page) =>
  page.getByRole("button", { name: "Continuar" }).click();
export const enviar = (page: Page) =>
  page.getByRole("button", { name: "Confirmar e enviar inscrição" }).click();
