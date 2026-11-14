"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  centavosDoCampo,
  centavosParaCampo,
  formatarCentavos,
  valorContribuicaoSchema,
  type ValorContribuicao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { inicioDoPerfil } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

const CHAVE = ["parametros", "valor-contribuicao"];

// "de R$ 30,00 para R$ 35,00": o histórico guarda os centavos como texto.
const reais = (texto: string | null) =>
  texto === null ? "—" : formatarCentavos(Number(texto));

// Parâmetros institucionais da coordenação. Por enquanto, o valor da
// contribuição social (RF41, prancha 8-1); a prancha não diz onde fica o cartão,
// e a página é uma proposta da equipe. A alteração vale só para os pagamentos
// registrados depois dela.
export default function ParametrosPage() {
  const { data: sessao } = useSessao();
  const permitido = sessao?.perfil === "coordenacao";
  const cliente = useQueryClient();
  const titulo = useId();
  const campo = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [editado, setEditado] = useState<string | null>(null);
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState<number | null>(null);
  const [semMudanca, setSemMudanca] = useState(false);

  const consulta = useQuery({
    queryKey: CHAVE,
    queryFn: () => api<ValorContribuicao>("/parametros/valor-contribuicao"),
    enabled: permitido,
    staleTime: 0,
  });
  const salvar = useMutation({
    mutationFn: (valorCentavos: number) =>
      api<ValorContribuicao>("/parametros/valor-contribuicao", {
        method: "PUT",
        body: JSON.stringify({ valorCentavos }),
      }),
    onSuccess: (dados) => {
      cliente.setQueryData(CHAVE, dados);
      setEditado(null);
      setSalvo(dados.valorCentavos);
    },
  });

  if (!sessao) return <p role="status">Carregando…</p>;
  if (!permitido) {
    return (
      <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-start gap-3 rounded-xl border bg-card p-8">
        <span aria-hidden className="ui-vazio-icone">
          <Lock className="size-6" />
        </span>
        <h1 className="ui-h2">Você não tem acesso aos parâmetros</h1>
        <p className="ui-subtitulo m-0">
          Os parâmetros institucionais, como o valor da contribuição social, são
          alterados só pela coordenação.
        </p>
        <Link
          href={inicioDoPerfil(sessao.perfil)}
          className={buttonVariants({ variant: "link", className: "px-0" })}
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  const dados = consulta.data;
  const texto =
    editado ?? (dados ? centavosParaCampo(dados.valorCentavos) : "");

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setSalvo(null);
    setSemMudanca(false);
    const centavos = centavosDoCampo(texto);
    const r = valorContribuicaoSchema.safeParse({
      valorCentavos: centavos ?? undefined,
    });
    if (centavos === null || !r.success) {
      setErro(
        centavos === null
          ? texto.trim()
            ? "Informe o valor em reais, como 35,00."
            : "Informe o valor."
          : r.error!.issues[0].message,
      );
      entrada.current?.focus();
      return;
    }
    setErro(undefined);
    if (r.data.valorCentavos === dados?.valorCentavos) {
      setSemMudanca(true);
      return;
    }
    salvar.mutate(r.data.valorCentavos);
  }

  const ultima = dados?.ultimaAlteracao;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Parâmetros</h1>
        <p className="ui-subtitulo">
          Valores institucionais usados pelo sistema. Cada alteração fica
          registrada com o valor anterior, o novo, quem alterou e quando.
        </p>
      </div>

      <section
        aria-labelledby={titulo}
        className="ui-cartao max-w-[720px] gap-4"
      >
        <h2 id={titulo} className="ui-h2">
          Valor da contribuição social
        </h2>
        {consulta.isPending && <p role="status">Carregando…</p>}
        {consulta.isError && (
          <Aviso tipo="erro" titulo="Não foi possível carregar o valor.">
            Atualize a página para tentar de novo.
          </Aviso>
        )}
        {dados && (
          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            {salvo !== null && (
              <Aviso tipo="sucesso" focar titulo="Valor da contribuição salvo.">
                {formatarCentavos(salvo)} vale para os pagamentos registrados a
                partir de agora. Os pagamentos já registrados mantêm o valor da
                época.
              </Aviso>
            )}
            {semMudanca && (
              <Aviso
                tipo="info"
                focar
                titulo="O valor informado é igual ao atual."
              >
                Nada foi alterado.
              </Aviso>
            )}
            {salvar.isError && (
              <Aviso
                tipo="erro"
                focar
                titulo="Não foi possível salvar o valor."
              >
                Tente de novo.
              </Aviso>
            )}
            <Campo
              id={campo}
              rotulo="Valor (R$)"
              dica="Vale só para os pagamentos registrados depois da alteração."
              erro={erro}
              className="max-w-[320px] max-sm:max-w-none"
            >
              {(props) => (
                <input
                  {...props}
                  ref={entrada}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={classeEntrada}
                  value={texto}
                  onChange={(e) => {
                    setEditado(e.target.value);
                    setErro(undefined);
                    setSemMudanca(false);
                  }}
                />
              )}
            </Campo>
            <p className="ui-dica m-0">
              {ultima
                ? `Última alteração: de ${reais(ultima.valorAnterior)} para ${reais(ultima.valorNovo)}, por ${ultima.por}, em ${dataHoraBr(ultima.em).replace(", ", ", às ")}.`
                : "Valor padrão, ainda sem alterações."}
            </p>
            <Button
              type="submit"
              className="w-fit max-sm:w-full"
              disabled={salvar.isPending}
            >
              {salvar.isPending ? "Salvando…" : "Salvar valor"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
