"use client";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  justificativaFaltaSchema,
  registroFaltaSchema,
  type ContagemFaltas,
  type FaltaDaSessao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";

// Contagem de faltas do ciclo (RF35), no prontuário e nos dados administrativos.
// Fica fora da agenda, que só mostra paciente, data, horário e status (RNF13).
export function ContadorFaltas({ contagem }: { contagem: ContagemFaltas }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">
        <strong>Faltas no ciclo:</strong> {contagem.faltas} de {contagem.limite}
      </p>
      {contagem.aviso === "primeira_falta" && (
        <Aviso tipo="alerta" titulo="Uma nova falta resulta em desligamento.">
          O paciente tem 1 falta neste ciclo. Faltas justificadas também contam.
        </Aviso>
      )}
      {contagem.aviso === "limite_atingido" && (
        <Aviso tipo="erro" titulo="Limite de faltas atingido.">
          O paciente chegou a {contagem.faltas} faltas neste ciclo. O
          desligamento por faltas é avaliado pela secretaria ou pela
          coordenação.
        </Aviso>
      )}
    </div>
  );
}

// Falta registrada na sessão (RF34): quem registrou, quando e a justificativa.
export function ResumoFalta({
  falta,
  podeJustificar,
  chave,
}: {
  falta: FaltaDaSessao;
  podeJustificar: boolean;
  chave: QueryKey;
}) {
  const origem =
    falta.origem === "cancelamento_fora_do_prazo"
      ? "Cancelamento fora do prazo"
      : "Falta do paciente";
  const autor = falta.registradaPeloPaciente
    ? "pelo paciente, pelo link da sessão"
    : `por ${falta.registradaPor ?? "responsável não identificado"}`;
  return (
    <div className="mt-2 flex flex-col gap-2 text-[15px]">
      <p className="ui-meta">
        {origem}, registrada {autor} em {dataHoraBr(falta.registradaEm)}
        {falta.retiradaDaContagem && " · desconsiderada na contagem"}
      </p>
      {falta.justificada ? (
        <p>
          <strong>Justificada</strong>
          {falta.motivo && `: ${falta.motivo}`}
          <span className="ui-meta">
            {" "}
            · por {falta.justificadaPor} em {dataHoraBr(falta.justificadaEm)}
          </span>
        </p>
      ) : (
        podeJustificar && <JustificarFalta faltaId={falta.id} chave={chave} />
      )}
    </div>
  );
}

function JustificarFalta({
  faltaId,
  chave,
}: {
  faltaId: string;
  chave: QueryKey;
}) {
  const cache = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = justificativaFaltaSchema.safeParse({ motivo });
    if (!resultado.success) {
      setErroCampo(resultado.error.issues[0]?.message);
      return;
    }
    setErroCampo(undefined);
    setSalvando(true);
    try {
      await api(`/faltas/${faltaId}/justificativa`, {
        method: "POST",
        body: JSON.stringify(resultado.data),
      });
      await cache.invalidateQueries({ queryKey: chave });
      setAberto(false);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível justificar a falta.",
      );
    } finally {
      setSalvando(false);
    }
  }

  const idFormulario = `justificar-${faltaId}`;
  return (
    <>
      <div>
        <Button type="button" variant="outline" onClick={() => setAberto(true)}>
          Marcar como justificada
        </Button>
      </div>
      <Dialogo
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Justificar falta"
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={idFormulario}
              data-principal
              disabled={salvando}
            >
              Salvar justificativa
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
          <MotivoJustificativa
            valor={motivo}
            aoMudar={setMotivo}
            erro={erroCampo}
          />
        </form>
      </Dialogo>
    </>
  );
}

// Registro da falta em sessão que já começou e não foi realizada (RF34), pela
// secretaria ou pelo estagiário responsável.
export function RegistrarFalta({
  sessaoId,
  chave,
}: {
  sessaoId: string;
  chave: QueryKey;
}) {
  const cache = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [justificada, setJustificada] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = registroFaltaSchema.safeParse({
      justificada,
      motivo: justificada ? motivo : undefined,
    });
    if (!resultado.success) {
      setErroCampo(resultado.error.issues[0]?.message);
      return;
    }
    setErroCampo(undefined);
    setSalvando(true);
    try {
      await api(`/sessoes/${sessaoId}/falta`, {
        method: "POST",
        body: JSON.stringify(resultado.data),
      });
      await cache.invalidateQueries({ queryKey: chave });
      setAberto(false);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível registrar a falta.",
      );
    } finally {
      setSalvando(false);
    }
  }

  const idFormulario = `falta-${sessaoId}`;
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setAberto(true)}>
        Registrar falta do paciente
      </Button>
      <Dialogo
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Registrar falta do paciente"
        subtitulo="A falta entra na contagem do ciclo, mesmo justificada."
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={idFormulario}
              data-principal
              disabled={salvando}
            >
              Registrar falta
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
          <label className="flex cursor-pointer items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={justificada}
              onChange={(e) => setJustificada(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              Falta justificada: o paciente apresentou comprovante (atestado,
              comprovante de trabalho etc.)
            </span>
          </label>
          {justificada && (
            <MotivoJustificativa
              valor={motivo}
              aoMudar={setMotivo}
              erro={erroCampo}
            />
          )}
        </form>
      </Dialogo>
    </>
  );
}

function MotivoJustificativa({
  valor,
  aoMudar,
  erro,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
}) {
  return (
    <Campo
      rotulo="Motivo da justificativa"
      dica="Descreva o comprovante, sem anexar o documento."
      erro={erro}
    >
      {(props) => (
        <textarea
          {...props}
          value={valor}
          maxLength={1000}
          onChange={(e) => aoMudar(e.target.value)}
          className={classeTextoLongo}
        />
      )}
    </Campo>
  );
}
