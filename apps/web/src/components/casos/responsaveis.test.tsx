import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Perfil, ResponsaveisDoCaso } from "@clinica/shared";
import { QuadroResponsaveis } from "./responsaveis";

const COMPLETO: ResponsaveisDoCaso = {
  casoId: "c1",
  nome: "Mariana Alves Toledo",
  situacao: "em_atendimento",
  supervisor: "Ricardo Menezes",
  estagiario: "Ana Beatriz Costa",
};
const SEM_ESTAGIARIO: ResponsaveisDoCaso = {
  ...COMPLETO,
  nome: "Roberto Carvalho",
  numero: "2026-00377",
  situacao: "aguardando_vinculo",
  supervisor: "Patrícia Nogueira",
  estagiario: null,
};
const SEM_NINGUEM: ResponsaveisDoCaso = {
  ...COMPLETO,
  nome: "Luana Martins",
  numero: "2026-00455",
  situacao: "aguardando_distribuicao",
  supervisor: null,
  estagiario: null,
};

function abrir(
  responsaveis: ResponsaveisDoCaso,
  perfil: Perfil,
  aoVincular?: () => void,
) {
  render(
    <QuadroResponsaveis
      responsaveis={responsaveis}
      perfil={perfil}
      aoVincular={aoVincular}
    />,
  );
  return screen.getByRole("region", { name: "Responsáveis pelo caso" });
}

// Rótulos e valores dos dois cartões, na ordem da prancha 2-3.
const cartoes = (quadro: HTMLElement) =>
  Array.from(quadro.querySelectorAll("dl")).map((dl) => [
    dl.querySelector("dt")?.textContent,
    dl.querySelector("dd")?.textContent,
  ]);

describe("Quadro de responsáveis da ficha (RF22)", () => {
  afterEach(cleanup);

  it("mostra o estagiário e o supervisor responsáveis, nessa ordem, sem dado clínico (RF22, RNF17)", () => {
    const quadro = abrir(COMPLETO, "secretaria");
    expect(cartoes(quadro)).toEqual([
      ["Estagiário responsável", "Ana Beatriz Costa"],
      ["Supervisor responsável", "Ricardo Menezes"],
    ]);
    expect(quadro.textContent).not.toMatch(/prioridade|queixa|prontu/i);
    // Com os dois responsáveis, não há orientação nem ação.
    expect(within(quadro).queryByRole("button")).toBeNull();
    expect(within(quadro).queryByRole("link")).toBeNull();
  });

  it("caso sem estagiário: o selo 'Aguardando vínculo de estagiário' no lugar do nome, e o supervisor vincula pelo quadro (RF22, RF21)", () => {
    const aoVincular = vi.fn();
    const quadro = abrir(SEM_ESTAGIARIO, "supervisor", aoVincular);
    expect(cartoes(quadro)).toEqual([
      ["Estagiário responsável", "Aguardando vínculo de estagiário"],
      ["Supervisor responsável", "Patrícia Nogueira"],
    ]);
    expect(
      within(quadro).getByText(
        "O caso fica aguardando o vínculo até você vincular um estagiário.",
      ),
    ).toBeTruthy();
    within(quadro).getByRole("button", { name: "Vincular estagiário" }).click();
    expect(aoVincular).toHaveBeenCalledOnce();
  });

  it("caso sem estagiário, para a secretaria: só o selo, sem a ação do supervisor (RF22, RNF16)", () => {
    const quadro = abrir(SEM_ESTAGIARIO, "secretaria");
    expect(
      within(quadro).getByText("Aguardando vínculo de estagiário"),
    ).toBeTruthy();
    expect(within(quadro).queryByRole("button")).toBeNull();
  });

  it("caso sem supervisor: os dois cartões com 'Pendente de distribuição', e a coordenação vai à distribuição (RF22)", () => {
    const quadro = abrir(SEM_NINGUEM, "coordenacao");
    expect(cartoes(quadro)).toEqual([
      ["Estagiário responsável", "Pendente de distribuição"],
      ["Supervisor responsável", "Pendente de distribuição"],
    ]);
    expect(
      within(quadro).getByText(
        "O caso ainda não foi distribuído a um supervisor.",
      ),
    ).toBeTruthy();
    expect(
      within(quadro)
        .getByRole("link", { name: "Ir para Distribuição de casos" })
        .getAttribute("href"),
    ).toBe("/distribuicao");
  });
});
