"use client";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { CalendarPlus, Clock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ausenciaEstagiarioSchema,
  LIMITE_JUSTIFICATIVA_CANCELAMENTO,
  type AcoesCancelamento,
  type ResultadoCancelamento,
  type StatusSessao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, diaDaSemanaBr, duracaoCurta, horaBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

// Sessão como as listas do prontuário e dos dados administrativos a devolvem.
type Sessao = {
  id: string;
  inicio: string;
  termino: string;
  estagiario: string;
  status: StatusSessao;
};

type Motivo = "pedido_paciente" | "administrativo" | "ausencia_estagiario";

const MINUTO = 60_000;
const hora = (valor: string) => horaBr(new Date(valor));
const comInicialMaiuscula = (texto: string) =>
  `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;

// A sessão agendada ou confirmada que ainda não começou, com alguma opção para quem
// está logado (RF15, RF16). Depois do início, o não comparecimento é falta (RF34).
export const aceitaCancelamento = (
  s: Pick<Sessao, "status" | "inicio">,
  acoes: AcoesCancelamento | undefined,
  agora: number,
) =>
  !!acoes &&
  (acoes.pedidoPaciente || acoes.administrativo || acoes.ausenciaEstagiario) &&
  (s.status === "agendada" || s.status === "confirmada") &&
  new Date(s.inicio).getTime() > agora;

// A ordem do protótipo: a secretaria começa pelo pedido do paciente; o estagiário e o
// supervisor, pela ausência do estagiário. O supervisor só registra a ausência.
function motivosPermitidos(acoes: AcoesCancelamento): Motivo[] {
  const lista: Motivo[] = [];
  if (acoes.pedidoPaciente) lista.push("pedido_paciente");
  if (!acoes.pedidoPaciente && acoes.ausenciaEstagiario)
    lista.push("ausencia_estagiario");
  if (acoes.administrativo) lista.push("administrativo");
  if (acoes.pedidoPaciente && acoes.ausenciaEstagiario)
    lista.push("ausencia_estagiario");
  return lista;
}

const ROTULOS: Record<Motivo, string> = {
  pedido_paciente: "O paciente pediu o cancelamento",
  administrativo: "Cancelamento para remarcar a sessão",
  ausencia_estagiario: "Ausência do estagiário",
};

// O efeito de cada motivo, antes de cancelar. A antecedência do pedido do paciente é
// calculada aqui só para informar; a que vale é a do registro, na API (DF20).
function Efeito({
  motivo,
  sessao,
  acoes,
  agora,
  souOEstagiario,
}: {
  motivo: Motivo;
  sessao: Sessao;
  acoes: AcoesCancelamento;
  agora: number;
  souOEstagiario: boolean;
}) {
  if (motivo === "administrativo") {
    return (
      <Aviso
        tipo="info"
        titulo="Cancelamento administrativo para remarcação: não conta como falta do paciente nem do estagiário, qualquer que seja a antecedência."
      />
    );
  }
  if (motivo === "ausencia_estagiario") {
    return (
      <Aviso
        tipo="info"
        titulo={
          souOEstagiario
            ? "Ausência do estagiário: conta nas suas faltas de estágio."
            : `Ausência do estagiário: conta nas faltas de estágio de ${sessao.estagiario}.`
        }
      />
    );
  }
  const minutos = Math.max(
    0,
    Math.floor((new Date(sessao.inicio).getTime() - agora) / MINUTO),
  );
  const noPrazo = minutos >= acoes.antecedenciaMinimaMinutos;
  const Icone = noPrazo ? Clock : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-[12px] border px-4 py-3.5 text-[15px] leading-[1.45]",
        noPrazo
          ? "border-[#a9cfe0] bg-info-fundo"
          : "border-[#f0cf9f] bg-alerta-fundo",
      )}
    >
      <Icone
        aria-hidden
        className={cn(
          "mt-0.5 size-5 shrink-0",
          noPrazo ? "text-primary" : "text-[#a85400]",
        )}
      />
      <p>
        <strong className="block">
          Antecedência: {duracaoCurta(minutos)}.
        </strong>{" "}
        {noPrazo
          ? "Cancelamento no prazo: não conta como falta."
          : "Cancelamento fora do prazo: conta como falta do paciente no ciclo."}{" "}
        <span className="ui-meta block">
          Calculada pelo sistema: registro às {horaBr(new Date(agora))} para a
          sessão das {hora(sessao.inicio)}.
        </span>
      </p>
    </div>
  );
}

// Diálogo "Cancelar sessão" (RF15 e RF16): o pedido do paciente, pela secretaria; o
// cancelamento para remarcar, pela secretaria ou pelo estagiário; e a ausência do
// estagiário, também pelo supervisor do caso. A justificativa é obrigatória.
export function DialogoCancelarSessao({
  nome,
  sessao,
  acoes,
  chave,
  aoFechar,
  aoConcluir,
}: {
  nome: string;
  sessao: Sessao;
  acoes: AcoesCancelamento;
  chave: QueryKey;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoCancelamento) => void;
}) {
  const cache = useQueryClient();
  const { data: usuario } = useSessao();
  const motivos = motivosPermitidos(acoes);
  const [motivo, setMotivo] = useState<Motivo>(motivos[0]);
  const [justificativa, setJustificativa] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<{
    tipo: "erro" | "alerta";
    texto: string;
  } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const campo = useRef<HTMLTextAreaElement>(null);

  // A antecedência mostrada acompanha o relógio enquanto o diálogo está aberto.
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 15_000);
    return () => clearInterval(relogio);
  }, []);

  const indicarCampo = (mensagem = "Informe o motivo do cancelamento.") => {
    setErroCampo(mensagem);
    campo.current?.focus();
  };

  async function cancelar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = ausenciaEstagiarioSchema.safeParse({ justificativa });
    if (!dados.success) {
      indicarCampo(dados.error.issues[0]?.message);
      return;
    }
    setErroCampo(undefined);
    setSalvando(true);
    try {
      const resultado =
        motivo === "ausencia_estagiario"
          ? await api<ResultadoCancelamento>(
              `/sessoes/${sessao.id}/ausencia-estagiario`,
              {
                method: "POST",
                body: JSON.stringify(dados.data),
              },
            )
          : await api<ResultadoCancelamento>(
              `/sessoes/${sessao.id}/cancelamento`,
              {
                method: "POST",
                body: JSON.stringify({ tipo: motivo, ...dados.data }),
              },
            );
      await cache.invalidateQueries({ queryKey: chave });
      aoConcluir(resultado);
    } catch (falha) {
      setSalvando(false);
      if (falha instanceof ErroApi && falha.status === 400) {
        indicarCampo();
        return;
      }
      // A sessão mudou desde que a lista abriu (começou, foi cancelada ou teve a
      // falta registrada): a lista é atualizada, e o diálogo explica.
      if (falha instanceof ErroApi && [404, 422].includes(falha.status)) {
        void cache.invalidateQueries({ queryKey: chave });
        setErro({ tipo: "alerta", texto: falha.message });
        return;
      }
      setErro({
        tipo: "erro",
        texto:
          falha instanceof Error
            ? falha.message
            : "Não foi possível cancelar a sessão.",
      });
    }
  }

  const idFormulario = `cancelar-${sessao.id}`;
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Cancelar sessão"
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Voltar
          </Button>
          <Button
            type="submit"
            form={idFormulario}
            variant="destructive"
            data-principal
            disabled={salvando}
          >
            Cancelar sessão
          </Button>
        </>
      }
    >
      <form
        id={idFormulario}
        noValidate
        onSubmit={cancelar}
        className="flex flex-col gap-4"
      >
        {erro && <Aviso tipo={erro.tipo} titulo={erro.texto} />}
        <dl className="ui-resumo-caso">
          <div>
            <dt>Paciente</dt>
            <dd>{nome}</dd>
          </div>
          <div>
            <dt>Estagiário</dt>
            <dd>{sessao.estagiario}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{comInicialMaiuscula(diaDaSemanaBr(sessao.inicio))}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>
              {hora(sessao.inicio)} às {hora(sessao.termino)}
            </dd>
          </div>
        </dl>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1.5 text-[15px] font-semibold">
            Motivo do cancelamento (obrigatório)
          </legend>
          {motivos.map((m) => (
            <label key={m} className="ui-opcao">
              <input
                type="radio"
                name={`motivo-${sessao.id}`}
                value={m}
                checked={motivo === m}
                onChange={() => setMotivo(m)}
              />
              <span>{ROTULOS[m]}</span>
            </label>
          ))}
        </fieldset>
        <Campo rotulo="Justificativa (obrigatório)" erro={erroCampo}>
          {(props) => (
            <textarea
              {...props}
              ref={campo}
              value={justificativa}
              maxLength={LIMITE_JUSTIFICATIVA_CANCELAMENTO}
              onChange={(e) => setJustificativa(e.target.value)}
              className={`${classeTextoLongo} min-h-[96px]`}
            />
          )}
        </Campo>
        <Efeito
          motivo={motivo}
          sessao={sessao}
          acoes={acoes}
          agora={agora}
          souOEstagiario={usuario?.perfil === "estagiario"}
        />
      </form>
    </Dialogo>
  );
}

// O resultado, logo acima da lista: o que aconteceu com a sessão e se o paciente
// foi avisado. "Avisado por e-mail" e "ainda não avisado" ficam separados, para a
// equipe saber quem ainda precisa de contato (RF16; o RF17 completa no Ciclo 5).
export function ResultadoDoCancelamento({
  nome,
  inicio,
  resultado,
  casoId,
}: {
  nome: string;
  inicio: string;
  resultado: ResultadoCancelamento;
  casoId?: string;
}) {
  const { data: usuario } = useSessao();
  const quando = `${dataBr(inicio)}, às ${hora(inicio)}`;
  const { titulo, texto } = {
    no_prazo: {
      titulo: "Sessão cancelada.",
      texto: `A sessão de ${nome} em ${quando}, foi cancelada no prazo e não conta como falta.`,
    },
    fora_do_prazo: {
      titulo: "Sessão cancelada.",
      texto: `A sessão de ${nome} em ${quando}, foi cancelada fora do prazo e conta como falta do paciente no ciclo.`,
    },
    administrativo: {
      titulo: "Sessão cancelada para remarcação.",
      texto: `A sessão de ${nome} em ${quando}, foi cancelada e não conta como falta.`,
    },
    ausencia_estagiario: {
      titulo: "Ausência registrada.",
      texto: `A sessão de ${nome} em ${quando}, foi cancelada.`,
    },
    desligamento: {
      titulo: "Sessão cancelada.",
      texto: `A sessão de ${nome} em ${quando}, foi cancelada.`,
    },
  }[resultado.classificacao];
  const contato =
    usuario?.perfil === "secretaria"
      ? "Entre em contato com ele por telefone ou WhatsApp."
      : "Peça à secretaria para entrar em contato com ele.";
  const podeAgendar =
    resultado.classificacao === "administrativo" &&
    casoId &&
    (usuario?.perfil === "secretaria" || usuario?.perfil === "estagiario");
  return (
    <div className="flex flex-col gap-3">
      <Aviso tipo="sucesso" titulo={titulo} focar>
        {texto}
        {resultado.avisoAoPaciente === "email_enviado" &&
          " O paciente foi avisado por e-mail."}
      </Aviso>
      {resultado.avisoAoPaciente === "sem_email" && (
        <Aviso
          tipo="alerta"
          titulo="O paciente não tem e-mail cadastrado e ainda não foi avisado."
        >
          {contato}
        </Aviso>
      )}
      {resultado.avisoAoPaciente === "email_nao_enviado" && (
        <Aviso
          tipo="alerta"
          titulo="Não foi possível enviar o e-mail, e o paciente ainda não foi avisado."
        >
          {contato}
        </Aviso>
      )}
      {podeAgendar && (
        <Link
          href={`/agendar-sessao?caso=${casoId}`}
          className={cn(buttonVariants(), "w-fit max-md:w-full")}
        >
          <CalendarPlus aria-hidden className="size-4" />
          Agendar nova sessão
        </Link>
      )}
    </div>
  );
}
