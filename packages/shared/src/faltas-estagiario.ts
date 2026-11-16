import { z } from "zod";
import { dataValida } from "./datas";

// Relação de faltas do estagiário (RF39): as sessões canceladas por ausência real
// do estagiário (RF16), para o supervisor e a coordenação (RNF35). Sem o nome do
// paciente nem o motivo da ausência. A contagem do semestre é do RF40, e a
// reprovação, do RF63.

// O período são dias do calendário de Brasília (AAAA-MM-DD), inteiros. Sem o
// estagiário, a consulta traz todos os que o perfil pode ver.
export const consultaFaltasEstagiarioSchema = z
  .object({
    estagiarioId: z.uuid("Escolha um estagiário da lista.").optional(),
    inicio: z.string().refine(dataValida, "Informe a data inicial."),
    fim: z.string().refine(dataValida, "Informe a data final."),
  })
  .superRefine((v, ctx) => {
    if (dataValida(v.inicio) && dataValida(v.fim) && v.inicio > v.fim) {
      ctx.addIssue({
        code: "custom",
        path: ["inicio"],
        message: "A data inicial não pode ser posterior à data final.",
      });
    }
  });
export type ConsultaFaltasEstagiario = z.infer<
  typeof consultaFaltasEstagiarioSchema
>;

// Primeiro dia do semestre de uma data: 1º de janeiro ou 1º de julho. A consulta
// abre com o semestre vigente até hoje.
export const inicioDoSemestre = (data: string) =>
  `${data.slice(0, 4)}-${Number(data.slice(5, 7)) <= 6 ? "01" : "07"}-01`;

export type FaltaDoEstagiario = {
  id: string;
  estagiario: { id: string; nome: string };
  // Início da sessão cancelada e o momento do registro da ausência.
  inicio: string;
  registradaEm: string;
};

export type FaltasDoEstagiario = {
  inicio: string;
  fim: string;
  faltas: FaltaDoEstagiario[];
};

// Os estagiários do campo "Estagiário": para o supervisor, os que ele supervisiona
// hoje e os que têm falta registrada enquanto o caso era dele; para a
// coordenação, todos.
export type EstagiarioComFaltas = { id: string; nome: string };
