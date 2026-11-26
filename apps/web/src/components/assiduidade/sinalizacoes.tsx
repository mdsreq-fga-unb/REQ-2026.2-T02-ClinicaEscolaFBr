"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DECISOES_REPROVACAO,
  LIMITE_FALTAS_ESTAGIARIO,
  NOMES_DECISAO_REPROVACAO,
  registroDecisaoSchema,
  semestreDaData,
  type DecisaoDaSinalizacao,
  type DecisaoReprovacao,
  type SinalizacaoReprovacao,
  type Sinalizacoes,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { inicioDoPerfil } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr, horaBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

// "21/08, às 16:00; 17/09, às 10:00 e 12/11/2026, às 16:00": a data e o horário de
// cada sessão (nit 4 da inspeção), com o ano na última, ou em todas quando as
// sessões passam de um ano para outro.
export function listaDeSessoes(sessoes: string[]) {
  const anos = new Set(sessoes.map((s) => dataBr(s).slice(6)));
  const itens = sessoes.map((s, i) => {
    const data = dataBr(s);
    const comAno = anos.size > 1 || i === sessoes.length - 1;
    return `${comAno ? data : data.slice(0, 5)}, às ${horaBr(new Date(s))}`;
  });
  return itens.length > 1
    ? `${itens.slice(0, -1).join("; ")} e ${itens[itens.length - 1]}`
    : (itens[0] ?? "");
}

// As sessões que o perfil vê, e as faltas em casos de outros supervisores, que o
// supervisor só vê como número (RNF35).
function TextoSessoes({ s }: { s: SinalizacaoReprovacao }) {
  const outros = s.faltasDeOutrosSupervisores;
  return (
    <>
      {s.sessoes.length > 0 && <>Sessões: {listaDeSessoes(s.sessoes)}.</>}
      {outros > 0 && (
        <>
          {" "}
          {s.sessoes.length > 0 ? "Mais " : ""}
          {plural(
            outros,
            "falta em casos de outros supervisores",
            "faltas em casos de outros supervisores",
          )}
          .
        </>
      )}
    </>
  );
}

// Depois da terceira falta, a contagem continua subindo, mas a sinalização é a
// mesma (prancha 7-2).
function contagemAtualizada(s: SinalizacaoReprovacao) {
  return s.faltas > LIMITE_FALTAS_ESTAGIARIO
    ? `${s.estagiario.nome} tem agora ${s.faltas} faltas em ${s.semestre}. A sinalização de ${dataBr(s.geradaEm)} continua a mesma, com a contagem atualizada.`
    : null;
}

const CHAVE_ANUNCIO = "sinalizacao-anunciada:";

// Quais sinalizações ainda não foram anunciadas nesta sessão do navegador. O
// `role="alert"` vale só na primeira vez, para o leitor de tela não repetir o
// anúncio a cada página (nit 4 da inspeção).
function useAnunciar(ids: string[]) {
  const chave = ids.join(",");
  const novas = useMemo(() => {
    const resultado = new Set<string>();
    for (const id of chave ? chave.split(",") : []) {
      try {
        if (!sessionStorage.getItem(CHAVE_ANUNCIO + id)) resultado.add(id);
      } catch {
        resultado.add(id);
      }
    }
    return resultado;
  }, [chave]);
  useEffect(() => {
    for (const id of novas) {
      try {
        sessionStorage.setItem(CHAVE_ANUNCIO + id, "1");
      } catch {
        // Sem o armazenamento da sessão, o aviso é anunciado de novo.
      }
    }
  }, [novas]);
  return novas;
}

// Faixa de alerta em "Meus casos" (RF63, prancha 7-2): as sinalizações abertas dos
// estagiários que o supervisor tem hoje. Sem sinalização, ou se a consulta falhar,
// a página segue sem a faixa.
export function FaixaSinalizacoes() {
  const consulta = useQuery({
    queryKey: ["sinalizacoes-reprovacao", "abertas"],
    queryFn: () =>
      api<Sinalizacoes>("/sinalizacoes-reprovacao?situacao=abertas"),
  });
  const lista = consulta.data?.sinalizacoes ?? [];
  const anunciar = useAnunciar(lista.map((s) => s.id));
  if (lista.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {lista.map((s) => {
        const atualizada = contagemAtualizada(s);
        return (
          <section
            key={s.id}
            role={anunciar.has(s.id) ? "alert" : undefined}
            aria-label={
              anunciar.has(s.id)
                ? undefined
                : `Sinalização de reprovação de ${s.estagiario.nome}`
            }
            className="flex gap-3 rounded-[12px] border border-[#efb4ad] bg-erro-fundo px-4 py-3.5 text-[15px] leading-[1.45]"
          >
            <TriangleAlert
              aria-hidden
              className="mt-px size-5 shrink-0 text-destructive"
            />
            <div className="min-w-0">
              <p className="font-bold">
                {s.estagiario.nome} atingiu {LIMITE_FALTAS_ESTAGIARIO} faltas no
                semestre {s.semestre}, o limite que reprova o campo de estágio.
              </p>
              <p className="mt-0.5">
                <TextoSessoes s={s} /> A decisão sobre o caso é da coordenação.
              </p>
              {atualizada && <p className="mt-1">{atualizada}</p>}
              <Link
                href="/sinalizacoes-reprovacao"
                className="mt-1 inline-block font-semibold text-primary underline underline-offset-2"
              >
                Ver as sinalizações de reprovação
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SemAcesso({
  perfil,
}: {
  perfil: Parameters<typeof inicioDoPerfil>[0];
}) {
  return (
    <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-start gap-3 rounded-xl border bg-card p-8">
      <span aria-hidden className="ui-vazio-icone">
        <Lock className="size-6" />
      </span>
      <h1 className="ui-h2">Você não tem acesso a esta sinalização</h1>
      <p className="ui-subtitulo m-0">
        A sinalização de reprovação é vista só pelo supervisor do estagiário e
        pela coordenação.
      </p>
      <Link
        href={inicioDoPerfil(perfil)}
        className={buttonVariants({ variant: "link", className: "px-0" })}
      >
        Voltar para a página inicial
      </Link>
    </div>
  );
}

function Abertas({
  lista,
  coordenacao,
  aoDecidir,
}: {
  lista: SinalizacaoReprovacao[];
  coordenacao: boolean;
  aoDecidir: (s: SinalizacaoReprovacao) => void;
}) {
  if (lista.length === 0) {
    return (
      <div role="status" className="ui-painel p-5">
        <p className="ui-h2">Nenhuma sinalização aguardando decisão</p>
        <p className="ui-dica mt-1">
          Quando um estagiário atingir {LIMITE_FALTAS_ESTAGIARIO} faltas no
          semestre, ele aparece aqui.
        </p>
      </div>
    );
  }
  const atualizadas = lista.map(contagemAtualizada).filter(Boolean);
  const botao = (s: SinalizacaoReprovacao, className?: string) => (
    <Button
      className={className}
      aria-label={`Registrar decisão sobre a reprovação de ${s.estagiario.nome}`}
      onClick={() => aoDecidir(s)}
    >
      Registrar decisão
    </Button>
  );
  return (
    <>
      <div className="ui-painel">
        <table className="ui-tabela max-md:hidden [&_td]:px-5 [&_th]:px-5">
          <caption className="sr-only">
            Sinalizações de reprovação aguardando a decisão institucional
          </caption>
          <thead>
            <tr>
              <th scope="col">Estagiário</th>
              <th scope="col">Supervisor</th>
              <th scope="col">Faltas no semestre</th>
              <th scope="col">Sinalizado em</th>
              {coordenacao && <th scope="col">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.id}>
                <td className="[overflow-wrap:anywhere]">
                  <span className="block">{s.estagiario.nome}</span>
                  <span className="ui-meta block">
                    <TextoSessoes s={s} />
                  </span>
                </td>
                <td>{s.supervisores.join(", ") || "—"}</td>
                <td className="whitespace-nowrap">
                  {s.faltas} em {s.semestre}
                </td>
                <td className="whitespace-nowrap">{dataBr(s.geradaEm)}</td>
                {coordenacao && <td>{botao(s)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="flex flex-col divide-y divide-border px-4 md:hidden">
          {lista.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5 py-3">
              <span className="font-bold [overflow-wrap:anywhere]">
                {s.estagiario.nome}
              </span>
              <span>
                {plural(s.faltas, "falta", "faltas")} em {s.semestre} ·
                sinalizado em {dataBr(s.geradaEm)}
              </span>
              <span className="ui-meta">
                Supervisor: {s.supervisores.join(", ") || "—"}
              </span>
              <span className="ui-meta">
                <TextoSessoes s={s} />
              </span>
              {coordenacao && botao(s, "mt-2 self-start")}
            </li>
          ))}
        </ul>
      </div>
      {atualizadas.map((texto) => (
        <Aviso key={texto} tipo="info" titulo={texto!} />
      ))}
    </>
  );
}

const ESTILO_DECISAO: Record<DecisaoReprovacao, string> = {
  confirmada: "border-[#efb4ad] bg-erro-fundo text-destructive",
  nao_aplicada: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
};

// Linha do tempo de uma sinalização decidida (prancha 7-3): a sinalização e cada
// decisão, da mais antiga para a mais recente, sem apagar nenhuma. A justificativa
// só vem para a coordenação; o supervisor vê a decisão, quem registrou e quando
// (apontamento 2 da inspeção do RF64).
function Decidida({
  s,
  coordenacao,
  aoDecidir,
}: {
  s: SinalizacaoReprovacao;
  coordenacao: boolean;
  aoDecidir: (s: SinalizacaoReprovacao) => void;
}) {
  // Uma nova decisão só é aceita depois de a contagem mudar desde a última
  // decisão (RF64); a API recusa com 409 do mesmo jeito.
  const ultima = s.decisoes[s.decisoes.length - 1];
  const mudou = !ultima || ultima.faltas !== s.faltas;
  return (
    <li className="ui-painel flex flex-col gap-3 p-4 sm:px-5">
      <h3 className="ui-h2">
        Histórico de {s.estagiario.nome} · {s.semestre}
      </h3>
      <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
        <li className="flex flex-col gap-0.5">
          <span className="ui-selo self-start border-border bg-muted text-foreground">
            Sinalização de reprovação
          </span>
          <span className="ui-meta">
            {dataBr(s.geradaEm)} · {LIMITE_FALTAS_ESTAGIARIO} faltas.
          </span>
        </li>
        {s.decisoes.map((d, i) => (
          <li key={d.id} className="flex flex-col gap-0.5">
            <span
              className={cn("ui-selo self-start", ESTILO_DECISAO[d.decisao])}
            >
              {NOMES_DECISAO_REPROVACAO[d.decisao]}
            </span>
            {d.justificativa && (
              <p className="[overflow-wrap:anywhere]">{d.justificativa}</p>
            )}
            <span className="ui-meta">
              Registrada por {d.por} em{" "}
              {dataHoraBr(d.em).replace(", ", ", às ")}, com{" "}
              {plural(d.faltas, "falta", "faltas")}.
              {i > 0 && " A decisão anterior continua no histórico."}
            </span>
          </li>
        ))}
      </ol>
      <p>
        Contagem atual: {plural(s.faltas, "falta", "faltas")} em {s.semestre}.
      </p>
      {coordenacao ? (
        mudou ? (
          <>
            <p className="ui-dica">
              A contagem mudou desde a última decisão. A decisão registrada
              continua valendo; se for o caso, registre uma nova decisão.
            </p>
            <Button
              variant="outline"
              className="self-start"
              aria-label={`Registrar nova decisão sobre a reprovação de ${s.estagiario.nome}`}
              onClick={() => aoDecidir(s)}
            >
              Registrar nova decisão
            </Button>
          </>
        ) : (
          <p className="ui-dica">
            Uma nova decisão pode ser registrada se a contagem mudar.
          </p>
        )
      ) : (
        <p className="ui-dica">
          O registro da decisão é exclusivo da coordenação.
        </p>
      )}
    </li>
  );
}

function Encerrada({
  s,
  coordenacao,
  aoDecidir,
}: {
  s: SinalizacaoReprovacao;
  coordenacao: boolean;
  aoDecidir: (s: SinalizacaoReprovacao) => void;
}) {
  if (s.motivoEncerramento === "decisao") {
    return <Decidida s={s} coordenacao={coordenacao} aoDecidir={aoDecidir} />;
  }
  const vigente = s.semestre === semestreDaData(hojeBr());
  const falta = s.faltaReclassificada;
  return (
    <li className="ui-painel flex flex-col gap-2 p-4 sm:px-5">
      <span className="ui-selo self-start border-border bg-muted text-foreground">
        Sinalização encerrada sem decisão
      </span>
      <p className="font-semibold">
        {s.estagiario.nome} · {s.semestre}
      </p>
      <p>
        Sinalizada em {dataBr(s.geradaEm)} e encerrada em{" "}
        {dataBr(s.encerradaEm)}: a contagem caiu para{" "}
        {LIMITE_FALTAS_ESTAGIARIO - 1}, abaixo do limite, porque{" "}
        {falta?.inicio
          ? `a falta de ${dataBr(falta.inicio).slice(0, 5)}`
          : falta
            ? "uma falta num caso de outro supervisor"
            : "a falta"}{" "}
        foi reclassificada como cancelamento administrativo.
      </p>
      {vigente && (
        <p className="ui-dica">
          Se a contagem voltar a {LIMITE_FALTAS_ESTAGIARIO} neste semestre, a
          sinalização é gerada de novo.
        </p>
      )}
    </li>
  );
}

// Diálogo da decisão institucional (RF64, prancha 7-3), só para a coordenação. O
// resumo das faltas e o aviso de que a contagem não muda ficam também no celular
// (nit 4 da inspeção). O erro tem um resumo com link para o campo.
function DialogoDecisao({
  sinalizacao,
  aoFechar,
  aoConcluir,
}: {
  sinalizacao: SinalizacaoReprovacao;
  aoFechar: () => void;
  aoConcluir: (decisao: DecisaoDaSinalizacao) => void;
}) {
  const [decisao, setDecisao] = useState<DecisaoReprovacao | "">("");
  const [justificativa, setJustificativa] = useState("");
  const [erros, setErros] = useState<{
    decisao?: string;
    justificativa?: string;
  }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const idFormulario = `decisao-${sinalizacao.id}`;
  const nome = sinalizacao.estagiario.nome;

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const r = registroDecisaoSchema.safeParse({
      decisao: decisao || undefined,
      justificativa,
    });
    if (!r.success) {
      const novos: typeof erros = {};
      for (const issue of r.error.issues) {
        const campo = issue.path[0] as keyof typeof erros;
        novos[campo] ??= issue.message;
      }
      setErros(novos);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      aoConcluir(
        await api<DecisaoDaSinalizacao>(
          `/sinalizacoes-reprovacao/${sinalizacao.id}/decisoes`,
          { method: "POST", body: JSON.stringify(r.data) },
        ),
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível registrar a decisão.",
      );
      setSalvando(false);
    }
  }

  const campoComErro = erros.decisao
    ? `${idFormulario}-confirmada`
    : erros.justificativa
      ? `${idFormulario}-justificativa`
      : null;
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={`Decisão sobre a reprovação de ${nome}`}
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={idFormulario}
            data-principal
            disabled={salvando}
          >
            Registrar decisão
          </Button>
        </>
      }
    >
      <form
        id={idFormulario}
        noValidate
        onSubmit={salvar}
        className="flex flex-col gap-4"
      >
        {erro && <Aviso tipo="erro" titulo={erro} />}
        {campoComErro && (
          <Aviso tipo="erro" titulo="A decisão não foi registrada." focar>
            {erros.decisao ? "Escolha a " : "Escreva a "}
            <a href={`#${campoComErro}`} className="underline">
              {erros.decisao ? "decisão" : "justificativa"}
            </a>
            .
          </Aviso>
        )}
        <p className="text-[15px] text-muted-foreground">
          {plural(sinalizacao.faltas, "falta", "faltas")} no semestre{" "}
          {sinalizacao.semestre}
          {sinalizacao.sessoes.length > 0 &&
            `: ${listaDeSessoes(sinalizacao.sessoes)}`}
          . Supervisor: {sinalizacao.supervisores.join(", ") || "—"}.
        </p>
        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={
            erros.decisao ? `${idFormulario}-decisao-erro` : undefined
          }
        >
          <legend className="mb-1 text-[15px] font-semibold">Decisão</legend>
          {DECISOES_REPROVACAO.map((opcao) => (
            <label
              key={opcao}
              className="flex cursor-pointer items-center gap-3 text-[15px]"
            >
              <input
                id={`${idFormulario}-${opcao}`}
                type="radio"
                name="decisao"
                value={opcao}
                checked={decisao === opcao}
                onChange={() => setDecisao(opcao)}
                className="size-5 accent-primary"
              />
              {NOMES_DECISAO_REPROVACAO[opcao]}
            </label>
          ))}
          {erros.decisao && (
            <p
              id={`${idFormulario}-decisao-erro`}
              className="text-sm text-destructive"
            >
              {erros.decisao}
            </p>
          )}
        </fieldset>
        <Campo
          id={`${idFormulario}-justificativa`}
          rotulo="Justificativa"
          erro={erros.justificativa}
        >
          {(props) => (
            <textarea
              {...props}
              value={justificativa}
              maxLength={1000}
              onChange={(e) => setJustificativa(e.target.value)}
              className={classeTextoLongo}
            />
          )}
        </Campo>
        <Aviso
          tipo="info"
          titulo="A decisão não muda a contagem de faltas. Os efeitos acadêmicos e a eventual desativação do acesso do estagiário (RF54) são tratados fora desta tela."
        />
      </form>
    </Dialogo>
  );
}

// Sinalizações de reprovação (RF63, prancha 7-2): as que aguardam a decisão da
// coordenação e o histórico das encerradas. O supervisor vê só as dos estagiários
// dele, com as datas só dos casos dele; a coordenação vê todas e registra a
// decisão institucional (RF64, prancha 7-3).
export function SinalizacoesDeReprovacao() {
  const { data: sessao } = useSessao();
  const cache = useQueryClient();
  const coordenacao = sessao?.perfil === "coordenacao";
  const permitido = sessao?.perfil === "supervisor" || coordenacao;
  const [decidindo, setDecidindo] = useState<SinalizacaoReprovacao | null>(
    null,
  );
  const [concluido, setConcluido] = useState<string | null>(null);
  const consulta = useQuery({
    queryKey: ["sinalizacoes-reprovacao", "todas"],
    queryFn: () => api<Sinalizacoes>("/sinalizacoes-reprovacao?situacao=todas"),
    enabled: permitido,
    staleTime: 0,
  });

  if (!sessao) return <p role="status">Carregando…</p>;
  if (!permitido) return <SemAcesso perfil={sessao.perfil} />;

  const lista = consulta.data?.sinalizacoes ?? [];
  const abertas = lista.filter((s) => !s.encerradaEm);
  const encerradas = lista.filter((s) => s.encerradaEm);
  const negado =
    consulta.error instanceof ErroApi && consulta.error.status === 403;
  const decidir = (s: SinalizacaoReprovacao) => {
    setConcluido(null);
    setDecidindo(s);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Sinalizações de reprovação</h1>
        <p className="ui-subtitulo">
          Estagiários que atingiram {LIMITE_FALTAS_ESTAGIARIO} faltas no
          semestre e aguardam a decisão institucional.
        </p>
      </div>

      {concluido && <Aviso tipo="sucesso" titulo={concluido} focar />}

      {consulta.isPending && (
        <p role="status" aria-busy="true" className="font-semibold">
          Consultando as sinalizações…
        </p>
      )}

      {consulta.isError && (
        <Aviso
          tipo="erro"
          titulo={
            negado
              ? consulta.error.message
              : "Não foi possível consultar as sinalizações."
          }
        >
          {!negado && (
            <Button variant="outline" onClick={() => void consulta.refetch()}>
              Tentar novamente
            </Button>
          )}
        </Aviso>
      )}

      {consulta.data && (
        <>
          <section
            aria-labelledby="titulo-abertas"
            className="flex flex-col gap-3"
          >
            <h2 id="titulo-abertas" className="ui-h2">
              Aguardando a decisão
            </h2>
            <Abertas
              lista={abertas}
              coordenacao={coordenacao}
              aoDecidir={decidir}
            />
          </section>
          {encerradas.length > 0 && (
            <section
              aria-labelledby="titulo-historico"
              className="flex flex-col gap-3"
            >
              <h2 id="titulo-historico" className="ui-h2">
                Histórico
              </h2>
              <ol className="flex flex-col gap-3">
                {encerradas.map((s) => (
                  <Encerrada
                    key={s.id}
                    s={s}
                    coordenacao={coordenacao}
                    aoDecidir={decidir}
                  />
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {decidindo && (
        <DialogoDecisao
          sinalizacao={decidindo}
          aoFechar={() => setDecidindo(null)}
          aoConcluir={(d) => {
            setDecidindo(null);
            setConcluido(
              `Decisão registrada: ${NOMES_DECISAO_REPROVACAO[d.decisao].toLowerCase()} para ${decidindo.estagiario.nome}.`,
            );
            void cache.invalidateQueries({
              queryKey: ["sinalizacoes-reprovacao"],
            });
          }}
        />
      )}
    </div>
  );
}
