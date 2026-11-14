"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, FileText, Info } from "lucide-react";
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
export function Termo({
  termo,
  aviso,
  estado,
  children,
}: {
  termo: TermoVigente | null;
  aviso?: ReactNode;
  estado?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const [abertos, setAbertos] = useState<number[]>([]);
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="ui-painel border-primary"
    >
      <div className="flex flex-col items-start justify-between gap-3 border-b border-border bg-info-fundo p-4 sm:flex-row sm:px-5">
        <h3
          id={`${id}-titulo`}
          className="flex w-full min-w-0 flex-1 gap-2 sm:w-auto"
        >
          <FileText aria-hidden className="mt-1 size-5 shrink-0 text-primary" />
          Termo de consentimento para tratamento de dados
        </h3>
        {termo && (
          <span className="ui-selo border border-border bg-background">
            Versão {termo.versao}
            {termo.provisoria ? " (provisória)" : ""}
          </span>
        )}
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {aviso}
        {termo ? (
          <>
            <p>{termo.introducao}</p>
            <p className="ui-dica flex items-start gap-2">
              <Info
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              Abra cada tópico para ler o termo completo antes de concordar.
            </p>
            <div>
              {termo.topicos.map((topico, i) => (
                <div key={i} className="border-t border-border">
                  <h4>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 py-3 text-left font-semibold text-primary"
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
                      <span>{topico.titulo}</span>
                      <span className="flex shrink-0 items-center gap-1 text-sm">
                        {abertos.includes(i) ? "Recolher" : "Ler tópico"}
                        {abertos.includes(i) ? (
                          <ChevronUp aria-hidden className="size-4" />
                        ) : (
                          <ChevronDown aria-hidden className="size-4" />
                        )}
                      </span>
                    </button>
                  </h4>
                  <div
                    id={`${id}-${i}`}
                    hidden={!abertos.includes(i)}
                    className="space-y-3 pb-4"
                  >
                    <Texto corpo={topico.corpo} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          estado
        )}
        <div className="space-y-3 border-t border-border pt-4">{children}</div>
      </div>
    </section>
  );
}
