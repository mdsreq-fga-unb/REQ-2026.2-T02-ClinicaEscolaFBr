"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  AvisoPendente,
  AvisoRegistrado,
  CanalAvisoManual,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { diaDaSemanaBr, horaBr } from "@/lib/formato";
import { cn } from "@/lib/utils";

const CHAVE = ["cancelamentos", "avisos-pendentes"];

type Registro = { aviso: AvisoPendente; canal: CanalAvisoManual };

const quando = (aviso: AvisoPendente) =>
  `${diaDaSemanaBr(aviso.inicio)}, às ${horaBr(new Date(aviso.inicio))}`;

// Por que o paciente ainda não foi avisado, com ícone e texto (RNF56). O motivo
// da ausência do estagiário não aparece (CFP art. 9º).
function Situacao({ aviso }: { aviso: AvisoPendente }) {
  if (aviso.motivo === "sem_email") {
    return (
      <Aviso
        tipo="alerta"
        titulo={`${aviso.paciente} não tem e-mail cadastrado e ainda não recebeu o aviso.`}
      />
    );
  }
  return (
    <Aviso
      tipo="erro"
      titulo={
        aviso.motivo === "email_nao_enviado"
          ? `Não foi possível enviar o e-mail a ${aviso.paciente}.`
          : `O envio do e-mail a ${aviso.paciente} não foi concluído.`
      }
    >
      A sessão de {quando(aviso)}, continua cancelada.{" "}
      {aviso.url
        ? "Avise o paciente pelo WhatsApp."
        : "Avise o paciente por outro contato da ficha."}
    </Aviso>
  );
}

function ItemDoAviso({
  aviso,
  registrando,
  aoRegistrar,
}: {
  aviso: AvisoPendente;
  registrando: boolean;
  aoRegistrar: (canal: CanalAvisoManual) => void;
}) {
  return (
    <li className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <Situacao aviso={aviso} />
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
          Mensagem pronta
        </p>
        <p className="rounded-[10px] border border-border bg-muted px-4 py-3.5 text-sm leading-[1.55] whitespace-pre-line [overflow-wrap:anywhere]">
          {aviso.mensagem}
        </p>
      </div>
      {aviso.url ? (
        // Abre a mensagem pronta numa aba nova e registra o envio, como no
        // agendamento (DF24).
        <a
          href={aviso.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enviar pelo WhatsApp para ${aviso.paciente} (abre em nova aba)`}
          onClick={() => aoRegistrar("whatsapp")}
          className={cn(buttonVariants(), "w-fit max-md:w-full")}
        >
          <MessageCircle aria-hidden />
          Enviar pelo WhatsApp
        </a>
      ) : (
        <>
          <p className="text-[15px]">
            O paciente não tem celular cadastrado. Avise por outro contato da
            ficha.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/pacientes/${aviso.casoId}`}
              aria-label={`Ver contatos de ${aviso.paciente}`}
              className="text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              Ver contatos
            </Link>
            <Button
              type="button"
              variant="outline"
              disabled={registrando}
              aria-label={`Registrar que o paciente foi avisado: ${aviso.paciente}`}
              onClick={() => aoRegistrar("outro")}
              className="max-md:w-full"
            >
              Registrar que o paciente foi avisado
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

// Cartão "Avise o paciente sobre o cancelamento", na Agenda da secretaria (RF17):
// os cancelamentos por ausência do estagiário em que o e-mail não chegou ao
// paciente. O item sai da lista quando a secretaria registra o aviso. Sem aviso
// pendente, o cartão não aparece.
export function AvisosDeCancelamento() {
  const cache = useQueryClient();
  const [registrado, setRegistrado] = useState<Registro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const consulta = useQuery({
    queryKey: CHAVE,
    queryFn: () => api<AvisoPendente[]>("/cancelamentos/avisos-pendentes"),
  });
  const registro = useMutation({
    mutationFn: ({ aviso, canal }: Registro) =>
      api<AvisoRegistrado>(`/cancelamentos/${aviso.id}/aviso`, {
        method: "POST",
        body: JSON.stringify({ canal }),
      }),
    onMutate: () => {
      setErro(null);
      setRegistrado(null);
    },
    onSuccess: async (_resposta, feito) => {
      await cache.invalidateQueries({ queryKey: CHAVE });
      setRegistrado(feito);
    },
    onError: (falha, { aviso, canal }) => {
      // Outra pessoa da secretaria já registrou, ou o aviso mudou: a lista atualiza.
      if (falha instanceof ErroApi && [404, 409, 422].includes(falha.status)) {
        void cache.invalidateQueries({ queryKey: CHAVE });
        setErro(falha.message);
        return;
      }
      setErro(
        canal === "whatsapp"
          ? `A mensagem para ${aviso.paciente} foi aberta, mas o aviso não ficou registrado. Tente de novo.`
          : `Não foi possível registrar o aviso a ${aviso.paciente}. Tente de novo.`,
      );
    },
  });

  if (consulta.isPending) return null;
  if (consulta.isError) {
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível carregar os avisos de cancelamento."
      >
        Verifique a sua conexão e tente de novo.
      </Aviso>
    );
  }

  const avisos = consulta.data;
  return (
    <>
      {registrado && (
        <Aviso tipo="sucesso" titulo="Aviso registrado." focar>
          {registrado.canal === "whatsapp"
            ? `A mensagem para ${registrado.aviso.paciente} foi aberta no WhatsApp, e o aviso saiu da lista.`
            : `O aviso a ${registrado.aviso.paciente} foi registrado e saiu da lista.`}
        </Aviso>
      )}
      {erro && <Aviso tipo="alerta" titulo={erro} />}
      {avisos.length > 0 && (
        <section
          aria-labelledby="titulo-avisos-cancelamento"
          className="ui-cartao"
        >
          <h2 id="titulo-avisos-cancelamento" className="ui-h2">
            Avise o paciente sobre o cancelamento
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {avisos.map((aviso) => (
              <ItemDoAviso
                key={aviso.id}
                aviso={aviso}
                registrando={registro.isPending}
                aoRegistrar={(canal) => registro.mutate({ aviso, canal })}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
