"use client";
import { useId, useState } from "react";
import { termoVigenteSchema, type TermoVigente } from "@clinica/shared";

export async function buscarTermoVigente(): Promise<TermoVigente> {
  const resposta = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/termo/vigente`,
    {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!resposta.ok) throw new Error("Termo indisponível");
  return termoVigenteSchema.parse(await resposta.json());
}
// O texto editorial usa parágrafos, listas e destaques. HTML nunca é executado;
// referências Markdown são exibidas pelo rótulo, sem links relativos à documentação.
function destaque(texto: string) {
  return texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/(\*\*.*?\*\*)/g)
    .map((parte, i) =>
      parte.startsWith("**") ? (
        <strong key={i}>{parte.slice(2, -2)}</strong>
      ) : (
        parte
      ),
    );
}
function Texto({ corpo }: { corpo: string }) {
  return corpo.split(/\n\s*\n/).map((bloco, i) =>
    bloco.startsWith("- ") ? (
      <ul key={i} className="list-disc pl-6 space-y-2">
        {bloco.split(/\n(?=- )/).map((item, j) => (
          <li key={j}>{destaque(item.slice(2))}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>{destaque(bloco)}</p>
    ),
  );
}
export function Termo({ termo }: { termo: TermoVigente }) {
  const id = useId();
  const [abertos, setAbertos] = useState<number[]>([]);
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="space-y-4 rounded-lg border p-4"
    >
      <h3 id={`${id}-titulo`} className="font-bold">
        {termo.titulo}
      </h3>
      {termo.provisoria && (
        <p className="font-semibold">
          Versão provisória — aguardando aprovação da FBr. Ambiente de
          validação.
        </p>
      )}
      <p>{termo.introducao}</p>
      {termo.topicos.map((topico, i) => (
        <div key={i} className="border-t pt-3">
          <h4>
            <button
              type="button"
              className="w-full py-2 text-left font-semibold"
              aria-expanded={abertos.includes(i)}
              aria-controls={`${id}-${i}`}
              onClick={() =>
                setAbertos((antes) =>
                  antes.includes(i)
                    ? antes.filter((n) => n !== i)
                    : [...antes, i],
                )
              }
            >
              {topico.titulo}
            </button>
          </h4>
          <div
            id={`${id}-${i}`}
            hidden={!abertos.includes(i)}
            className="space-y-3 py-3"
          >
            <Texto corpo={topico.corpo} />
          </div>
        </div>
      ))}
    </section>
  );
}
