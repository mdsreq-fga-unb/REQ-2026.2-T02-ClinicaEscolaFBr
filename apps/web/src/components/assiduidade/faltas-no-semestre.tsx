"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import {
  LIMITE_FALTAS_ESTAGIARIO,
  consultaFaltasSemestreSchema,
  reclassificacaoFaltaSchema,
  rotuloSemestre,
  semestreDaData,
  type ConsultaFaltasSemestre,
  type EstagiarioComFaltas,
  type EstagiarioNoSemestre,
  type FaltaNoSemestre,
  type FaltasNoSemestre as Resposta,
  type ResultadoReclassificacao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import {
  Campo,
  classeEntrada,
  classeTextoLongo,
} from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr, horaBr } from "@/lib/formato";
import { cn } from "@/lib/utils";

const endereco = ({ semestre, estagiarioId }: ConsultaFaltasSemestre) =>
  `/faltas-estagiarios/semestre?${new URLSearchParams({
    semestre,
    ...(estagiarioId ? { estagiarioId } : {}),
  })}`;

const hora = (valor: string) => horaBr(new Date(valor));
const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

// "N de 3" até o limite e "Limite atingido" a partir dele, com o texto, e não só a
// cor (RNF1). Sem falta, um traço.
function Situacao({ faltas }: { faltas: number }) {
  if (faltas === 0) return <span aria-label="Sem faltas">—</span>;
  const atingido = faltas >= LIMITE_FALTAS_ESTAGIARIO;
  return (
    <span
      className={cn(
        "ui-selo",
        atingido
          ? "border-[#efb4ad] bg-erro-fundo text-destructive"
          : "border-[#f0cf9f] bg-alerta-fundo text-alerta",
      )}
    >
      {atingido
        ? "Limite atingido"
        : `${faltas} de ${LIMITE_FALTAS_ESTAGIARIO}`}
    </span>
  );
}

// A falta reclassificada fica riscada e diz por quê, em texto (prancha 7-1). O
// motivo só vem para a coordenação.
function TextoReclassificada({ falta }: { falta: FaltaNoSemestre }) {
  const r = falta.reclassificada!;
  return (
    <>
      Reclassificada como cancelamento administrativo por {r.por} em{" "}
      {dataBr(r.em)}.{r.motivo && ` Motivo: ${r.motivo}`}
    </>
  );
}

function Detalhe({
  dados,
  semestre,
  coordenacao,
  aoReclassificar,
}: {
  dados: EstagiarioNoSemestre;
  semestre: string;
  coordenacao: boolean;
  aoReclassificar: (falta: FaltaNoSemestre) => void;
}) {
  const { estagiario, faltas, faltasDeOutrosSupervisores, linhas } = dados;
  return (
    <section aria-labelledby="titulo-faltas-estagiario" className="ui-painel">
      <div className="border-b border-border p-4 sm:px-5">
        <h3 id="titulo-faltas-estagiario" className="ui-h2">
          {estagiario.nome} · {plural(faltas, "falta", "faltas")} em {semestre}
        </h3>
        {faltasDeOutrosSupervisores > 0 && (
          <p className="ui-dica mt-1">
            {plural(
              faltasDeOutrosSupervisores,
              "falta em casos de outros supervisores",
              "faltas em casos de outros supervisores",
            )}{" "}
            {faltasDeOutrosSupervisores === 1 ? "entra" : "entram"} na contagem,
            sem a data.
          </p>
        )}
      </div>
      {linhas.length === 0 ? (
        <p className="p-4 sm:px-5">
          Nenhuma falta deste estagiário nos seus casos em {semestre}.
        </p>
      ) : (
        <>
          <table className="ui-tabela max-md:hidden [&_td]:px-5 [&_th]:px-5">
            <caption className="sr-only">
              Faltas de {estagiario.nome} em {semestre}
            </caption>
            <thead>
              <tr>
                <th scope="col">Data da sessão</th>
                <th scope="col">Horário</th>
                <th scope="col">Registrado em</th>
                {coordenacao && <th scope="col">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {linhas.map((f) =>
                f.reclassificada ? (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap text-muted-foreground line-through">
                      {dataBr(f.inicio)}
                    </td>
                    <td className="whitespace-nowrap text-muted-foreground line-through">
                      {hora(f.inicio)}
                    </td>
                    <td colSpan={coordenacao ? 2 : 1} className="ui-meta">
                      <TextoReclassificada falta={f} />
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap">{dataBr(f.inicio)}</td>
                    <td className="whitespace-nowrap">{hora(f.inicio)}</td>
                    <td className="whitespace-nowrap">
                      {dataHoraBr(f.registradaEm)}
                    </td>
                    {coordenacao && (
                      <td>
                        <Button
                          variant="outline"
                          aria-label={`Reclassificar a falta de ${dataBr(f.inicio)}, às ${hora(f.inicio)}`}
                          onClick={() => aoReclassificar(f)}
                        >
                          Reclassificar
                        </Button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <ul className="flex flex-col divide-y divide-border px-4 md:hidden">
            {linhas.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 py-3">
                <span
                  className={cn(
                    f.reclassificada && "text-muted-foreground line-through",
                  )}
                >
                  {dataBr(f.inicio)}, {hora(f.inicio)}
                </span>
                {f.reclassificada ? (
                  <span className="ui-meta">
                    <TextoReclassificada falta={f} />
                  </span>
                ) : (
                  <>
                    <span className="ui-meta">
                      Registrado em {dataHoraBr(f.registradaEm)}
                    </span>
                    {coordenacao && (
                      <Button
                        variant="outline"
                        className="self-start"
                        aria-label={`Reclassificar a falta de ${dataBr(f.inicio)}, às ${hora(f.inicio)}`}
                        onClick={() => aoReclassificar(f)}
                      >
                        Reclassificar
                      </Button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DialogoReclassificar({
  falta,
  estagiario,
  aoFechar,
  aoConcluir,
}: {
  falta: FaltaNoSemestre;
  estagiario: EstagiarioNoSemestre;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoReclassificacao) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const r = reclassificacaoFaltaSchema.safeParse({ motivo });
    if (!r.success) {
      setErroCampo(r.error.issues[0]?.message);
      // O foco vai para o campo com erro (prancha 7-1).
      campo.current?.focus();
      return;
    }
    setErroCampo(undefined);
    setSalvando(true);
    try {
      aoConcluir(
        await api<ResultadoReclassificacao>(
          `/faltas-estagiarios/${falta.id}/reclassificacao`,
          { method: "POST", body: JSON.stringify(r.data) },
        ),
      );
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível reclassificar a falta.",
      );
      setSalvando(false);
    }
  }

  const { nome } = estagiario.estagiario;
  const antes = estagiario.faltas;
  const idFormulario = `reclassificar-${falta.id}`;
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={`Reclassificar a falta de ${dataBr(falta.inicio)}, às ${hora(falta.inicio)}?`}
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
            Reclassificar
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
        <p className="text-[15px]">
          A ausência passa a ser um cancelamento administrativo para remarcação,
          e a contagem de {nome} cai de {antes} para {Math.max(antes - 1, 0)}.
        </p>
        <Campo rotulo="Motivo da reclassificação" erro={erroCampo}>
          {(props) => (
            <textarea
              {...props}
              ref={campo}
              autoFocus
              value={motivo}
              maxLength={1000}
              onChange={(e) => setMotivo(e.target.value)}
              className={classeTextoLongo}
            />
          )}
        </Campo>
      </form>
    </Dialogo>
  );
}

// Faltas dos estagiários no semestre (RF40, prancha 7-1): a contagem de cada
// estagiário, pela data da sessão, com "N de 3" ou "Limite atingido". Ao abrir um
// estagiário, as faltas dele, com a reclassificação pela coordenação. O
// supervisor vê a contagem total, mas as datas só das faltas nos casos dele
// (RNF35). Montado pela página só para o supervisor e a coordenação.
export function FaltasNoSemestre({ coordenacao }: { coordenacao: boolean }) {
  const cache = useQueryClient();
  const vigente = semestreDaData(hojeBr());
  const [filtro, setFiltro] = useState({ semestre: vigente, estagiarioId: "" });
  const [consulta, setConsulta] = useState<ConsultaFaltasSemestre>({
    semestre: vigente,
  });
  const [aberto, setAberto] = useState<string | null>(null);
  const [reclassificando, setReclassificando] = useState<{
    falta: FaltaNoSemestre;
    estagiario: EstagiarioNoSemestre;
  } | null>(null);
  const [concluido, setConcluido] = useState<string | null>(null);

  const estagiarios = useQuery({
    queryKey: ["faltas-estagiarios", "estagiarios"],
    queryFn: () =>
      api<EstagiarioComFaltas[]>("/faltas-estagiarios/estagiarios"),
  });
  const dados = useQuery({
    queryKey: ["faltas-estagiarios", "semestre", consulta],
    queryFn: () => api<Resposta>(endereco(consulta)),
    staleTime: 0,
  });

  function consultar(evento: FormEvent) {
    evento.preventDefault();
    const r = consultaFaltasSemestreSchema.safeParse(
      filtro.estagiarioId ? filtro : { semestre: filtro.semestre },
    );
    if (!r.success) return;
    setConcluido(null);
    setAberto(r.data.estagiarioId ?? null);
    if (JSON.stringify(r.data) === JSON.stringify(consulta)) {
      void dados.refetch();
      return;
    }
    setConsulta(r.data);
  }

  const semestres = dados.data?.semestres ?? [vigente];
  const semestre = dados.data?.semestre ?? consulta.semestre;
  const lista = dados.data?.estagiarios ?? [];
  const detalhe =
    lista.find((e) => e.estagiario.id === aberto) ??
    (lista.length === 1 && consulta.estagiarioId ? lista[0] : undefined);
  const negado = dados.error instanceof ErroApi && dados.error.status === 403;

  return (
    <section aria-labelledby="titulo-semestre" className="flex flex-col gap-4">
      <h2 id="titulo-semestre" className="ui-h2">
        Faltas no semestre
      </h2>
      <form
        onSubmit={consultar}
        noValidate
        className="ui-painel flex flex-col gap-4 p-4 md:flex-row md:items-start md:p-5"
      >
        <Campo
          id="semestre-semestre"
          rotulo="Semestre"
          className="w-full md:w-60"
        >
          {(props) => (
            <select
              {...props}
              value={filtro.semestre}
              onChange={(e) =>
                setFiltro({ ...filtro, semestre: e.target.value })
              }
              className={classeEntrada}
            >
              {[...new Set([filtro.semestre, ...semestres])]
                .sort((a, b) => b.localeCompare(a))
                .map((s) => (
                  <option key={s} value={s}>
                    {rotuloSemestre(s)}
                  </option>
                ))}
            </select>
          )}
        </Campo>
        <Campo
          id="semestre-estagiarioId"
          rotulo="Estagiário"
          className="w-full md:w-72"
        >
          {(props) => (
            <select
              {...props}
              value={filtro.estagiarioId}
              onChange={(e) =>
                setFiltro({ ...filtro, estagiarioId: e.target.value })
              }
              className={classeEntrada}
            >
              <option value="">
                {coordenacao
                  ? "Todos os estagiários"
                  : "Todos os meus estagiários"}
              </option>
              {estagiarios.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Button type="submit" className="max-md:w-full md:mt-[30px]">
          Consultar
        </Button>
      </form>

      {concluido && <Aviso tipo="sucesso" titulo={concluido} focar />}

      {dados.isPending && (
        <p role="status" aria-busy="true" className="font-semibold">
          Consultando as faltas do semestre…
        </p>
      )}

      {dados.isError && (
        <Aviso
          tipo="erro"
          titulo={
            negado
              ? dados.error.message
              : "Não foi possível consultar as faltas do semestre."
          }
        >
          {!negado && (
            <Button variant="outline" onClick={() => void dados.refetch()}>
              Tentar novamente
            </Button>
          )}
        </Aviso>
      )}

      {dados.data && (
        <>
          {semestre !== vigente && (
            <p role="status" className="ui-dica">
              Contagem do semestre {semestre} preservada. A contagem recomeça do
              zero a cada semestre.
            </p>
          )}
          {lista.length === 0 ? (
            <div role="status" className="ui-painel p-5">
              <p className="ui-h2">Nenhum estagiário para mostrar</p>
            </div>
          ) : (
            <div className="ui-painel">
              <table className="ui-tabela max-md:hidden [&_td]:px-5 [&_th]:px-5">
                <caption className="sr-only">
                  Faltas de cada estagiário em {semestre}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Estagiário</th>
                    <th scope="col">Faltas em {semestre}</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((e) => (
                    <tr key={e.estagiario.id}>
                      <td className="[overflow-wrap:anywhere]">
                        <button
                          type="button"
                          className="text-left text-primary underline-offset-2 hover:underline"
                          aria-expanded={
                            detalhe?.estagiario.id === e.estagiario.id
                          }
                          onClick={() => setAberto(e.estagiario.id)}
                        >
                          {e.estagiario.nome}
                        </button>
                      </td>
                      <td>{e.faltas}</td>
                      <td>
                        <Situacao faltas={e.faltas} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="flex flex-col divide-y divide-border px-4 md:hidden">
                {lista.map((e) => (
                  <li
                    key={e.estagiario.id}
                    className="flex flex-col gap-1 py-3"
                  >
                    <button
                      type="button"
                      className="text-left font-bold text-primary [overflow-wrap:anywhere]"
                      aria-expanded={detalhe?.estagiario.id === e.estagiario.id}
                      onClick={() => setAberto(e.estagiario.id)}
                    >
                      {e.estagiario.nome}
                    </button>
                    <span>
                      {e.faltas === 0
                        ? `Nenhuma falta em ${semestre}`
                        : `${plural(e.faltas, "falta", "faltas")} em ${semestre}`}
                    </span>
                    {e.faltas > 0 && (
                      <span>
                        <Situacao faltas={e.faltas} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detalhe && (
            <Detalhe
              dados={detalhe}
              semestre={semestre}
              coordenacao={coordenacao}
              aoReclassificar={(falta) =>
                setReclassificando({ falta, estagiario: detalhe })
              }
            />
          )}
        </>
      )}

      {reclassificando && (
        <DialogoReclassificar
          falta={reclassificando.falta}
          estagiario={reclassificando.estagiario}
          aoFechar={() => setReclassificando(null)}
          aoConcluir={(r) => {
            const nome = reclassificando.estagiario.estagiario.nome;
            setReclassificando(null);
            setConcluido(
              `Falta reclassificada. ${nome} tem agora ${plural(r.faltas, "falta", "faltas")} em ${r.semestre}.`,
            );
            // A relação do período (RF39) também muda: a falta passa a aparecer
            // reclassificada.
            void cache.invalidateQueries({ queryKey: ["faltas-estagiarios"] });
          }}
        />
      )}
    </section>
  );
}
