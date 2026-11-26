"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  CAMPOS_EVOLUCAO,
  CAMPOS_EVOLUCAO_ANTIGA,
  esquemaDaCorrecao,
  type DataLimiteCorrecao,
  type VersaoEvolucao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { BotaoComMotivo } from "@/components/comum/botao-com-motivo";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import {
  CampoTexto,
  errosPorCampo,
  NAO_INFORMADO,
  type EvolucaoRegistrada,
} from "./fichas";

// "2026-12-14" -> "14/12/2026", sem passar por fuso horário.
export const diaBr = (data: string) => data.split("-").reverse().join("/");

const ID_MOTIVO = "motivo-correcao";

// Campos da ficha da evolução: os da DF38 ou, nas evoluções anteriores a ela, os
// antigos (DF23).
export const camposDaFicha = (evolucao: EvolucaoRegistrada) =>
  evolucao.humorAparencia !== null ? CAMPOS_EVOLUCAO : CAMPOS_EVOLUCAO_ANTIGA;

type Corrigida = { versao: number };

// Correção de evolução registrada (RF29): a ficha inteira, já preenchida com a
// versão vigente, e o motivo, obrigatório. A original continua no histórico.
export function FormularioCorrecaoEvolucao({
  prontuarioId,
  evolucao,
  aoCancelar,
  aoCorrigir,
}: {
  prontuarioId: string;
  evolucao: EvolucaoRegistrada;
  aoCancelar: () => void;
  aoCorrigir: (resultado: Corrigida) => void;
}) {
  const cache = useQueryClient();
  const campos = camposDaFicha(evolucao);
  const fichaAntiga = campos === CAMPOS_EVOLUCAO_ANTIGA;
  const [dados, setDados] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      campos.map(([campo]) => [
        campo,
        (evolucao as Record<string, string | null>)[campo] ?? "",
      ]),
    ),
    motivo: "",
  }));
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [focarResumo, setFocarResumo] = useState(0);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // O Enter num campo envia o formulário mesmo com o botão desativado.
    if (semMudanca) return;
    setErro(null);
    const resultado = esquemaDaCorrecao(fichaAntiga).safeParse(dados);
    if (!resultado.success) {
      setErros(errosPorCampo<Record<string, string>>(resultado.error.issues));
      // O aviso do topo recebe o foco e leva ao campo com erro.
      setFocarResumo((n) => n + 1);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      const resposta = await api<Corrigida>(
        `/prontuarios/${prontuarioId}/evolucoes/${evolucao.id}/correcoes`,
        { method: "POST", body: JSON.stringify(resultado.data) },
      );
      await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
      aoCorrigir(resposta);
    } catch (falha) {
      setErro(
        falha instanceof ErroApi && falha.status === 422
          ? falha.message
          : falha instanceof Error
            ? `A correção não foi salva. ${falha.message}`
            : "A correção não foi salva.",
      );
      // O prazo pode ter mudado: o prontuário é lido de novo.
      if (falha instanceof ErroApi && falha.status === 422)
        await cache.invalidateQueries({
          queryKey: ["prontuario", prontuarioId],
        });
    } finally {
      setSalvando(false);
    }
  }

  // A correção precisa mudar o conteúdo da ficha; sem mudança, o botão fica
  // desativado (o motivo sozinho não é correção).
  const semMudanca = campos.every(
    ([campo]) =>
      dados[campo].trim() ===
      ((evolucao as Record<string, string | null>)[campo] ?? "").trim(),
  );
  const primeiroErro = Object.keys(erros)[0];
  const rotuloDoErro =
    primeiroErro === "motivo"
      ? "motivo da correção"
      : (campos.find(([campo]) => campo === primeiroErro)?.[1] ??
        "campo indicado");

  return (
    <form noValidate onSubmit={salvar} className="flex flex-col gap-4">
      {primeiroErro && (
        <Aviso
          key={focarResumo}
          tipo="erro"
          titulo="A correção não foi salva."
          focar
        >
          Preencha o{" "}
          <a
            href={`#${primeiroErro === "motivo" ? ID_MOTIVO : `campo-${primeiroErro}`}`}
            className="font-semibold text-marca underline underline-offset-4"
          >
            {rotuloDoErro}
          </a>
          .
        </Aviso>
      )}
      {erro && <Aviso tipo="erro" titulo={erro} focar />}
      <div className="grid gap-4 min-[1366px]:grid-cols-2">
        {campos.map(([campo, rotulo]) => (
          <CampoTexto
            key={campo}
            id={`campo-${campo}`}
            rotulo={rotulo}
            opcional={campo === "intervencoesEncaminhamentos"}
            valor={dados[campo]}
            erro={erros[campo]}
            aoMudar={(valor) => setDados({ ...dados, [campo]: valor })}
          />
        ))}
      </div>
      <CampoTexto
        id={ID_MOTIVO}
        rotulo="Motivo da correção"
        valor={dados.motivo}
        erro={erros.motivo}
        aoMudar={(valor) => setDados({ ...dados, motivo: valor })}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <BotaoComMotivo
          motivo={
            semMudanca
              ? "Altere algum campo da evolução para salvar a correção."
              : null
          }
        >
          {(props) => (
            <Button {...props} type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar correção"}
            </Button>
          )}
        </BotaoComMotivo>
      </div>
    </form>
  );
}

// Versões da evolução, da vigente para a original, cada uma com o autor, a
// data/hora e o motivo (RF29). Cada versão é uma seção com título.
export function VersoesEvolucao({
  versoes,
  campos,
}: {
  versoes: VersaoEvolucao[];
  campos: readonly (readonly [string, string])[];
}) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {versoes.map((versao, indice) => {
        const titulo =
          indice === 0
            ? `Versão ${versao.versao} · atual`
            : versao.versao === 1
              ? "Versão 1 · original"
              : `Versão ${versao.versao}`;
        const idTitulo = `versao-${versao.versao}-${versao.em}`;
        return (
          <section
            key={versao.versao}
            aria-labelledby={idTitulo}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
          >
            <h4
              id={idTitulo}
              className={
                indice === 0
                  ? "w-fit rounded-full bg-sucesso-fundo px-2.5 py-0.5 text-sm font-semibold text-sucesso"
                  : "w-fit rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold"
              }
            >
              {titulo}
            </h4>
            <dl className="flex flex-col gap-1.5 text-[15px]">
              {campos.map(([campo, rotulo]) => (
                <div key={campo}>
                  <dt className="inline font-semibold">{rotulo}: </dt>
                  <dd className="inline whitespace-pre-wrap">
                    {(versao as Record<string, string | null>)[campo] ??
                      NAO_INFORMADO}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="ui-meta">
              {versao.motivo === null
                ? `Registrada por ${versao.autor} em ${dataHoraBr(versao.em)}.`
                : `Corrigida por ${versao.autor} em ${dataHoraBr(versao.em)}. Motivo: ${versao.motivo}`}
            </p>
          </section>
        );
      })}
    </div>
  );
}

// Data-limite para corrigir evoluções no semestre vigente, registrada pela
// coordenação (RF29). Sem a data, as correções continuam permitidas.
export function CartaoDataLimiteCorrecao() {
  const cache = useQueryClient();
  const consulta = useQuery({
    queryKey: ["data-limite-correcao"],
    queryFn: () => api<DataLimiteCorrecao>("/parametros/data-limite-correcao"),
    retry: false,
  });
  const [valor, setValor] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salva, setSalva] = useState(false);
  const [salvando, setSalvando] = useState(false);

  if (consulta.isPending) return <p role="status">Carregando a data-limite…</p>;
  if (consulta.isError || !consulta.data)
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível carregar a data-limite para correção de evoluções."
      />
    );
  const atual = consulta.data;
  const campo = valor ?? atual.dataLimite ?? "";

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (campo === (atual.dataLimite ?? "")) return;
    setErro(null);
    setSalva(false);
    if (!campo) {
      setErroCampo("Informe a data-limite.");
      requestAnimationFrame(() =>
        document.getElementById("data-limite-correcao")?.focus(),
      );
      return;
    }
    setErroCampo(null);
    setSalvando(true);
    try {
      const nova = await api<DataLimiteCorrecao>(
        "/parametros/data-limite-correcao",
        { method: "PUT", body: JSON.stringify({ dataLimite: campo }) },
      );
      cache.setQueryData(["data-limite-correcao"], nova);
      setValor(null);
      setSalva(true);
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section
      aria-labelledby="titulo-data-limite"
      className="ui-cartao flex flex-col gap-4"
    >
      <h2 id="titulo-data-limite" className="ui-h2">
        Data-limite para correção de evoluções
      </h2>
      {atual.pendente && (
        <Aviso
          tipo="alerta"
          titulo={`A data-limite do semestre ${atual.semestre} ainda não foi registrada. Enquanto isso, as correções continuam permitidas.`}
        />
      )}
      {salva && <Aviso tipo="sucesso" titulo="Data-limite salva." focar />}
      {erro && <Aviso tipo="erro" titulo={erro} focar />}
      <form noValidate onSubmit={salvar} className="flex flex-col gap-3">
        <Campo
          id="data-limite-correcao"
          rotulo={`Data-limite do semestre ${atual.semestre}`}
          dica="Vale para as evoluções das sessões deste semestre."
          erro={erroCampo ?? undefined}
        >
          {(props) => (
            <input
              {...props}
              type="date"
              value={campo}
              onChange={(e) => setValor(e.target.value)}
              className={`${classeEntrada} max-w-[220px]`}
            />
          )}
        </Campo>
        {atual.ultimaAlteracao && (
          <p className="ui-meta">
            Última alteração:{" "}
            {atual.ultimaAlteracao.valorAnterior
              ? `de ${diaBr(atual.ultimaAlteracao.valorAnterior)} para `
              : ""}
            {diaBr(atual.ultimaAlteracao.valorNovo)}, por{" "}
            {atual.ultimaAlteracao.por}, em{" "}
            {dataHoraBr(atual.ultimaAlteracao.em)}.
          </p>
        )}
        <div>
          {/* Sem mudança na data, não há o que salvar. */}
          <BotaoComMotivo
            motivo={
              campo === (atual.dataLimite ?? "")
                ? "Escolha uma data diferente da atual para salvar."
                : null
            }
          >
            {(props) => (
              <Button {...props} type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar data-limite"}
              </Button>
            )}
          </BotaoComMotivo>
        </div>
      </form>
    </section>
  );
}
