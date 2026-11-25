"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  revogacaoSchema,
  type ConsentimentoDaInscricao,
} from "@clinica/shared";
import { AcessoNegado } from "@/components/comum/acesso-negado";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { HistoricoConsentimento } from "@/components/consentimento/consentimento";
import { Button, buttonVariants } from "@/components/ui/button";
import { VerificacaoIdentidade } from "@/components/verificacao/verificacao-identidade";
import { api, ErroApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";
import { NOMES_SITUACAO_CASO } from "@/lib/formato";

export default function RevogacaoPage() {
  const { casoId } = useParams<{ casoId: string }>();
  const { data: sessao } = useSessao();
  const consulta = useQuery({
    queryKey: ["consentimento", casoId, sessao?.id],
    queryFn: () =>
      api<ConsentimentoDaInscricao>(`/casos/${casoId}/consentimento`, {
        cache: "no-store",
      }),
    enabled: sessao?.perfil === "secretaria",
    retry: false,
    gcTime: 0,
  });
  if (sessao && sessao.perfil !== "secretaria")
    return (
      <AcessoNegado
        titulo="Você não pode registrar a revogação"
        voltar={`/pacientes/${casoId}`}
        rotuloVoltar="Voltar para a ficha"
      >
        A revogação do consentimento é registrada pela secretaria, depois de
        confirmar a identidade de quem pede.
      </AcessoNegado>
    );
  if (!sessao || consulta.isPending)
    return <p role="status">Carregando consentimento…</p>;
  if (consulta.isError || !consulta.data)
    return (
      <Aviso tipo="erro" titulo="Não foi possível abrir o consentimento.">
        <Button onClick={() => void consulta.refetch()}>
          Tentar novamente
        </Button>
      </Aviso>
    );
  return (
    <Formulario
      key={consulta.data.inscricaoId}
      dados={consulta.data}
      casoId={casoId}
    />
  );
}

function Formulario({
  dados,
  casoId,
}: {
  dados: ConsentimentoDaInscricao;
  casoId: string;
}) {
  const [solicitante, setSolicitante] = useState(
    dados.menor ? "responsavel" : "titular",
  );
  const [forma, setForma] = useState("");
  const [documento, setDocumento] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ConsentimentoDaInscricao | null>(
    null,
  );
  const cliente = useQueryClient();
  const voltar = `/pacientes/${casoId}`;
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setErro("");
    const valido = revogacaoSchema.safeParse({
      solicitante,
      formaVerificacao: forma,
      documento,
    });
    if (!valido.success) {
      setErros(
        Object.fromEntries(
          valido.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      document.getElementById(String(valido.error.issues[0].path[0]))?.focus();
      setErro("A revogação não foi registrada. Confira os campos indicados.");
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const nova = await api<ConsentimentoDaInscricao>(
        `/inscricoes/${dados.inscricaoId}/revogacao`,
        { method: "POST", body: JSON.stringify(valido.data) },
      );
      setResultado(nova);
      await Promise.all(
        ["consentimento", "casos", "paciente", "fila", "triagem", "agenda"].map(
          (chave) => cliente.invalidateQueries({ queryKey: [chave] }),
        ),
      );
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível registrar a revogação. Tente novamente.",
      );
      if (e instanceof ErroApi && typeof e.corpo?.campo === "string") {
        setErros({ [e.corpo.campo]: e.message });
        document.getElementById(e.corpo.campo)?.focus();
      }
      if (e instanceof ErroApi && e.status === 409)
        await cliente.invalidateQueries({ queryKey: ["consentimento"] });
    } finally {
      setEnviando(false);
    }
  }
  const atual = resultado ?? dados;
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar}>Ficha do paciente</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">Revogação do consentimento</span>
      </nav>
      <div>
        <h1 className="ui-titulo">Revogação do consentimento</h1>
        <p className="ui-subtitulo">
          {dados.paciente} · Inscrição {dados.numero} ·{" "}
          {dados.situacao
            ? NOMES_SITUACAO_CASO[dados.situacao]
            : "Aguardando triagem"}
        </p>
      </div>
      {atual.revogacao ? (
        <>
          <Aviso
            tipo="sucesso"
            focar
            titulo={
              resultado
                ? "Revogação registrada."
                : "Este consentimento já foi revogado."
            }
          >
            O aceite original e os registros produzidos foram preservados.
          </Aviso>
          <HistoricoConsentimento dados={atual} />
          <Link
            href={voltar}
            className={buttonVariants({ variant: "outline" })}
          >
            Voltar para a ficha
          </Link>
        </>
      ) : !dados.aceite ? (
        <Aviso
          tipo="alerta"
          titulo="Esta inscrição não possui aceite de consentimento registrado."
        />
      ) : (
        <section className="ui-cartao">
          {erro && (
            <Aviso
              tipo="erro"
              focar={Object.keys(erros).length === 0}
              titulo={erro}
            />
          )}
          <form
            id="revogacao"
            onSubmit={salvar}
            noValidate
            className="flex flex-col gap-5"
          >
            <fieldset disabled={enviando} className="flex flex-col gap-3">
              <legend className="mb-2 font-semibold">
                Quem pede a revogação
              </legend>
              {[
                ["titular", "O próprio titular"],
                ["responsavel", "O responsável legal"],
              ].map(([valor, rotulo], i) => (
                <label key={valor} className="flex items-center gap-2">
                  <input
                    id={i === 0 ? "solicitante" : undefined}
                    type="radio"
                    name="solicitante"
                    value={valor}
                    checked={solicitante === valor}
                    onChange={() => setSolicitante(valor)}
                    aria-describedby={
                      erros.solicitante ? "erro-solicitante" : undefined
                    }
                  />
                  {rotulo}
                </label>
              ))}
              {erros.solicitante && (
                <p id="erro-solicitante" className="text-destructive">
                  {erros.solicitante}
                </p>
              )}
            </fieldset>
            <fieldset disabled={enviando} className="flex flex-col gap-3">
              <legend className="mb-2 font-semibold">
                Como a identidade foi confirmada
              </legend>
              {[
                ["documento", "Documento com foto, apresentado na clínica"],
                [
                  "verificacao_rf52",
                  "Verificação de identidade pelo sistema (RF52)",
                ],
              ].map(([valor, rotulo], i) => (
                <label key={valor} className="flex items-center gap-2">
                  <input
                    id={i === 0 ? "formaVerificacao" : undefined}
                    type="radio"
                    name="formaVerificacao"
                    value={valor}
                    checked={forma === valor}
                    onChange={() => setForma(valor)}
                    aria-describedby={
                      erros.formaVerificacao ? "erro-verificacao" : undefined
                    }
                  />
                  {rotulo}
                </label>
              ))}
              {erros.formaVerificacao && (
                <p id="erro-verificacao" className="text-destructive">
                  {erros.formaVerificacao}
                </p>
              )}
            </fieldset>
            {forma === "documento" && (
              <Campo
                id="documento"
                rotulo="Documento apresentado"
                dica="Informe o tipo do documento conferido, sem anexar foto ou cópia."
                erro={erros.documento}
              >
                {(props) => (
                  <input
                    {...props}
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    maxLength={120}
                    disabled={enviando}
                    className={classeEntrada}
                  />
                )}
              </Campo>
            )}
          </form>
          {forma === "verificacao_rf52" && (
            <VerificacaoIdentidade titulo="Confirmar a identidade de quem pede">
              {(v) => (
                <Aviso
                  tipo={v.numero === dados.numero ? "sucesso" : "erro"}
                  titulo={
                    v.numero === dados.numero
                      ? "Identidade confirmada para esta inscrição."
                      : "Esta verificação pertence a outra inscrição. Encerre-a e confirme a inscrição correta."
                  }
                />
              )}
            </VerificacaoIdentidade>
          )}
          <Aviso
            tipo="alerta"
            titulo={
              dados.situacao === "em_atendimento"
                ? "Efeitos para este paciente, que está em atendimento:"
                : "Efeitos da revogação:"
            }
          >
            {dados.situacao === "em_atendimento"
              ? "Novos agendamentos ficam bloqueados, as comunicações param e a revogação é sinalizada ao supervisor e à coordenação, que conduzem o encerramento."
              : "Se a inscrição estiver na fila, será retirada, com a situação cancelada por revogação do consentimento. Novos agendamentos e comunicações ao titular ficam suspensos."}{" "}
            O prontuário e os registros já feitos ficam guardados por pelo menos
            5 anos, com acesso restrito.
          </Aviso>
          <div className="flex flex-wrap justify-end gap-3 max-sm:[&>*]:w-full">
            <Link
              href={voltar}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancelar
            </Link>
            <Button
              type="submit"
              form="revogacao"
              variant="destructive"
              disabled={enviando}
            >
              {enviando ? "Registrando…" : "Registrar revogação"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
