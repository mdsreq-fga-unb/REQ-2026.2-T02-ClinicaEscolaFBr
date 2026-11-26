import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RelatorioFinalDoCiclo } from "@clinica/shared";
import { api, ErroApi } from "@/lib/api";
import {
  ImpressaoEEntregaDoRelatorio,
  VersoesDoRelatorio,
} from "./relatorio-final";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

const aprovada = {
  versao: 2,
  estado: "aprovado",
  autor: "Ana Beatriz Costa",
  enviadaEm: "2026-11-28T13:14:00Z",
  decisao: {
    por: "Ricardo Menezes",
    em: "2026-11-28T21:40:00Z",
    observacoes: null,
  },
} as const;
const devolvida = {
  versao: 1,
  estado: "devolvido",
  autor: "Ana Beatriz Costa",
  enviadaEm: "2026-11-24T13:14:00Z",
  decisao: {
    por: "Ricardo Menezes",
    em: "2026-11-25T18:00:00Z",
    observacoes: "detalhar na análise a evolução da ansiedade.",
  },
} as const;

const relatorio = (
  dados: Partial<RelatorioFinalDoCiclo> = {},
): RelatorioFinalDoCiclo => ({
  casoId: "c1",
  ciclo: 1,
  paciente: "Mariana Alves Toledo",
  responsavelLegal: null,
  versoes: [aprovada, devolvida],
  aprovada: {
    versao: 2,
    aprovadaPor: "Ricardo Menezes",
    aprovadaEm: "2026-11-28T21:40:00Z",
  },
  impressoes: [],
  entrega: null,
  ...dados,
});

const comCliente = (filho: ReactNode) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {filho}
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.mocked(api).mockReset();
});
afterEach(cleanup);

describe("Versões do relatório final no prontuário (RF33)", () => {
  it("lista as versões com a situação e o PDF só da aprovada", async () => {
    vi.mocked(api).mockResolvedValue(relatorio() as never);
    comCliente(<VersoesDoRelatorio casoId="c1" ciclo={1} podeFinalizar />);

    const lista = await screen.findByRole("list", {
      name: "Versões do relatório final",
    });
    expect(lista.textContent).toContain("Versão 2Aprovada");
    expect(lista.textContent).toContain(
      "Aprovada por Ricardo Menezes em 28/11/2026, às 18:40.",
    );
    expect(lista.textContent).toContain(
      "Devolvida por Ricardo Menezes em 25/11/2026. Observações: detalhar na análise a evolução da ansiedade.",
    );
    const pdf = screen.getAllByRole("link", { name: "Finalizar em PDF" });
    expect(pdf).toHaveLength(1);
    expect(pdf[0].getAttribute("href")).toBe("/relatorio-final/c1/2?ciclo=1");
    expect(api).toHaveBeenCalledWith("/casos/c1/relatorio-final?ciclo=1");
  });

  it("a coordenação consulta sem finalizar", async () => {
    vi.mocked(api).mockResolvedValue(relatorio() as never);
    comCliente(
      <VersoesDoRelatorio
        casoId="c1"
        ciclo={1}
        podeFinalizar={false}
        coordenacao
      />,
    );
    expect(
      await screen.findByText(
        "A coordenação consulta as versões, sem alterá-las.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Finalizar em PDF" })).toBeNull();
  });

  it("ciclo sem relatório", async () => {
    vi.mocked(api).mockResolvedValue("" as never);
    comCliente(<VersoesDoRelatorio casoId="c1" ciclo={1} podeFinalizar />);
    expect(await screen.findByText("Sem registro neste ciclo.")).toBeTruthy();
  });
});

describe("Impressão e entrega pela secretaria (RF33)", () => {
  it("relatório ainda não aprovado: só o aviso, sem imprimir", async () => {
    vi.mocked(api).mockResolvedValue(
      relatorio({ versoes: [], aprovada: null }) as never,
    );
    comCliente(<ImpressaoEEntregaDoRelatorio casoId="c1" />);
    expect(
      await screen.findByText(
        "Relatório ainda não aprovado: a secretaria só imprime a versão aprovada pelo supervisor.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Imprimir" })).toBeNull();
  });

  it("aprovado e ainda não impresso: imprimir antes de registrar a entrega", async () => {
    vi.mocked(api).mockResolvedValue(
      relatorio({ versoes: [aprovada] }) as never,
    );
    comCliente(<ImpressaoEEntregaDoRelatorio casoId="c1" />);
    expect(
      await screen.findByRole("heading", {
        name: "Relatório final de Mariana Alves Toledo",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Aprovado em 28/11/2026")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Imprimir" }).getAttribute("href"),
    ).toBe("/relatorio-final/c1/2?ciclo=1");
    expect(screen.getByText("Ainda não impresso.")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Registrar entrega" }),
    ).toBeNull();
  });

  it("exige a confirmação da via assinada e registra a entrega", async () => {
    const impresso = relatorio({
      versoes: [aprovada],
      impressoes: [{ por: "Juliana Rocha", em: "2026-11-30T12:12:00Z" }],
    });
    vi.mocked(api).mockImplementation(async (caminho: string) => {
      if (caminho.endsWith("/entrega?ciclo=1"))
        return {
          versao: 2,
          entregueA: "paciente",
          entregueEm: "2026-11-23",
          registradaPor: "Juliana Rocha",
          registradaEm: "2026-11-23T15:00:00Z",
        } as never;
      return impresso as never;
    });
    comCliente(<ImpressaoEEntregaDoRelatorio casoId="c1" />);
    expect(
      await screen.findByText(
        "Impresso por Juliana Rocha em 30/11/2026, às 09:12.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Registrar entrega" }));
    const via = screen.getByRole("checkbox", {
      name: "A via impressa foi assinada por Ana Beatriz Costa e por Ricardo Menezes",
    });
    expect(via.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByText(
        "Confirme que a via impressa foi assinada pelo estagiário e pelo supervisor.",
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(via);
    expect(api).toHaveBeenCalledTimes(1);

    fireEvent.click(via);
    fireEvent.change(screen.getByLabelText("Data da entrega"), {
      target: { value: "2026-11-23" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar entrega" }));
    expect(await screen.findByText("Entrega registrada.")).toBeTruthy();
    expect(api).toHaveBeenCalledWith(
      "/casos/c1/relatorio-final/entrega?ciclo=1",
      {
        method: "POST",
        body: JSON.stringify({
          viaAssinada: true,
          entregueA: "paciente",
          entregueEm: "2026-11-23",
        }),
      },
    );
  });

  it("mostra o responsável legal como opção só quando há um", async () => {
    vi.mocked(api).mockResolvedValue(
      relatorio({
        versoes: [aprovada],
        responsavelLegal: "Marcos Toledo",
        impressoes: [{ por: "Juliana Rocha", em: "2026-11-30T12:12:00Z" }],
      }) as never,
    );
    comCliente(<ImpressaoEEntregaDoRelatorio casoId="c1" />);
    const destino = await screen.findByLabelText("Entregue a");
    expect(
      Array.from((destino as HTMLSelectElement).options).map((o) => o.text),
    ).toEqual(["Paciente", "Responsável legal (Marcos Toledo)"]);
  });

  it("a entrega já registrada aparece no lugar do formulário", async () => {
    vi.mocked(api).mockResolvedValue(
      relatorio({
        versoes: [aprovada],
        impressoes: [{ por: "Juliana Rocha", em: "2026-11-30T12:12:00Z" }],
        entrega: {
          versao: 2,
          entregueA: "paciente",
          entregueEm: "2026-12-01",
          registradaPor: "Juliana Rocha",
          registradaEm: "2026-12-01T13:00:00Z",
        },
      }) as never,
    );
    comCliente(<ImpressaoEEntregaDoRelatorio casoId="c1" />);
    expect(
      await screen.findByText(
        /Entregue a Mariana Alves Toledo em 01\/12\/2026\. Registrado por Juliana Rocha/,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Registrar entrega" }),
    ).toBeNull();
  });

  it("mostra o erro da API no topo do formulário", async () => {
    const impresso = relatorio({
      versoes: [aprovada],
      impressoes: [{ por: "Juliana Rocha", em: "2026-11-30T12:12:00Z" }],
    });
    vi.mocked(api).mockImplementation(async (caminho: string) => {
      if (caminho.endsWith("/entrega?ciclo=1"))
        throw new ErroApi(409, "A entrega deste relatório já foi registrada.");
      return impresso as never;
    });
    comCliente(<ImpressaoEEntregaDoRelatorio casoId="c1" />);
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /via impressa/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar entrega" }));
    await waitFor(() =>
      expect(
        screen.getByText("A entrega deste relatório já foi registrada."),
      ).toBeTruthy(),
    );
  });
});
