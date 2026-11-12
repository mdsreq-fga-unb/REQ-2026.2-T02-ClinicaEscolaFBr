"use client";
import type { Perfil } from "@clinica/shared";
import { AcessoNegado } from "@/components/comum/acesso-negado";

// Volta de cada perfil: o supervisor vem de "Meus casos", o estagiário de "Meus
// pacientes", e a secretaria e a coordenação da lista de Pacientes.
const VOLTAR: Partial<Record<Perfil, { href: string; rotulo: string }>> = {
  supervisor: { href: "/meus-casos", rotulo: "Meus casos" },
  estagiario: { href: "/meus-pacientes", rotulo: "Meus pacientes" },
};
const PADRAO = { href: "/pacientes", rotulo: "Pacientes" };
export const voltarDoPerfil = (perfil: Perfil | undefined) =>
  (perfil && VOLTAR[perfil]) ?? PADRAO;

// Acesso negado ao prontuário (RF55, prancha 4-1): a mesma tela no prontuário, nos
// dados iniciais e no registro de evolução, sem o nome do paciente nem indicação
// do que o prontuário tem (RNF25).
export function AcessoNegadoAoProntuario({
  perfil,
}: {
  perfil: Perfil | undefined;
}) {
  const voltar = voltarDoPerfil(perfil);
  return (
    <AcessoNegado
      titulo="Você não tem acesso a este prontuário"
      voltar={voltar.href}
      rotuloVoltar={voltar.rotulo}
    >
      O prontuário só pode ser aberto pelo estagiário responsável pelo caso,
      pelo supervisor dele e pela coordenação. Se você acha que deveria ter
      acesso, fale com o supervisor do caso.
    </AcessoNegado>
  );
}
