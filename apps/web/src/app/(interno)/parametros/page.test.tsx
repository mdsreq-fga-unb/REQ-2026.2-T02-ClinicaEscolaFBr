import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ParametrosPage from "./page";
import { api } from "@/lib/api";

const sessao = vi.hoisted(() => ({
  atual: { id: "u1", perfil: "coordenacao" } as { id: string; perfil: string },
}));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: sessao.atual }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(api).mockReset();
  sessao.atual = { id: "u1", perfil: "coordenacao" };
});

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ParametrosPage />
    </QueryClientProvider>,
  );
}

describe("data-limite para correção de evoluções (RF29)", () => {
  it("sem a data do semestre, avisa que as correções continuam permitidas (RF29)", async () => {
    vi.mocked(api).mockResolvedValue({
      semestre: "2026/2",
      dataLimite: null,
      pendente: true,
      ultimaAlteracao: null,
    } as never);
    renderizar();
    expect(
      await screen.findByText(
        "A data-limite do semestre 2026/2 ainda não foi registrada. Enquanto isso, as correções continuam permitidas.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Parâmetros" }),
    ).toBeTruthy();
  });

  it("a coordenação salva a data, e a tela mostra a última alteração com o valor anterior, o novo e o autor (RF29)", async () => {
    vi.mocked(api).mockImplementation(async (caminho: string, init) => {
      if (init?.method === "PUT") {
        expect(JSON.parse(init.body as string)).toEqual({
          dataLimite: "2026-12-14",
        });
        return {
          semestre: "2026/2",
          dataLimite: "2026-12-14",
          pendente: false,
          ultimaAlteracao: {
            valorAnterior: "2026-07-13",
            valorNovo: "2026-12-14",
            por: "Helena Duarte",
            em: "2026-08-03T13:12:00Z",
          },
        } as never;
      }
      expect(caminho).toBe("/parametros/data-limite-correcao");
      return {
        semestre: "2026/2",
        dataLimite: "2026-07-13",
        pendente: false,
        ultimaAlteracao: null,
      } as never;
    });
    renderizar();
    const campo = await screen.findByLabelText(
      "Data-limite do semestre 2026/2",
    );
    expect((campo as HTMLInputElement).value).toBe("2026-07-13");
    fireEvent.change(campo, { target: { value: "2026-12-14" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar data-limite" }));
    expect(await screen.findByText("Data-limite salva.")).toBeTruthy();
    expect(
      screen.getByText(
        /Última alteração: de 13\/07\/2026 para 14\/12\/2026, por Helena Duarte, em/,
      ),
    ).toBeTruthy();
  });

  it("sem data, não envia e indica o campo (RF29)", async () => {
    vi.mocked(api).mockResolvedValue({
      semestre: "2026/2",
      dataLimite: null,
      pendente: true,
      ultimaAlteracao: null,
    } as never);
    renderizar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Salvar data-limite" }),
    );
    expect(await screen.findByText("Informe a data-limite.")).toBeTruthy();
    await waitFor(() =>
      expect(
        screen
          .getByLabelText("Data-limite do semestre 2026/2")
          .getAttribute("aria-invalid"),
      ).toBe("true"),
    );
    expect(vi.mocked(api)).toHaveBeenCalledTimes(1);
  });

  it("outros perfis veem o acesso negado, sem consultar a API (RF29)", async () => {
    sessao.atual = { id: "u2", perfil: "supervisor" };
    renderizar();
    expect(
      await screen.findByRole("heading", {
        name: "Você não tem acesso aos parâmetros",
      }),
    ).toBeTruthy();
    expect(vi.mocked(api)).not.toHaveBeenCalled();
  });
});
