import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FaixaAmbiente } from "./faixa-ambiente";

describe("Faixa do ambiente de validação", () => {
  afterEach(cleanup);

  it("aparece no ambiente de validação, pedindo só dados fictícios", () => {
    render(<FaixaAmbiente ambiente="validacao" />);
    expect(screen.getByRole("note").textContent).toContain(
      "Ambiente de validação: use só dados fictícios.",
    );
  });

  it("não aparece em produção nem no desenvolvimento", () => {
    const { container } = render(<FaixaAmbiente ambiente={undefined} />);
    expect(container.innerHTML).toBe("");
    render(<FaixaAmbiente ambiente="producao" />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
