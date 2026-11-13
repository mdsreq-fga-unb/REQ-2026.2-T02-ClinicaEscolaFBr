import { describe, expect, it } from "vitest";
import type { Perfil } from "@clinica/shared";
import { voltarDoPerfil } from "./acesso-negado";

describe("volta da tela de acesso negado ao prontuário (RF27, RNF25)", () => {
  it.each([
    ["estagiario", "/meus-pacientes", "Meus pacientes"],
    ["supervisor", "/meus-casos", "Meus casos"],
    ["secretaria", "/pacientes", "Pacientes"],
    ["coordenacao", "/pacientes", "Pacientes"],
    [undefined, "/pacientes", "Pacientes"],
  ] as [Perfil | undefined, string, string][])(
    "o perfil %s volta para %s (RF27, RNF25)",
    (perfil, href, rotulo) => {
      expect(voltarDoPerfil(perfil)).toEqual({ href, rotulo });
    },
  );
});
