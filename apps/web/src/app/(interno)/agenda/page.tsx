"use client";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { EstagiarioDoSupervisor } from "@clinica/shared";
import { AgendaDeSessoes } from "@/components/agenda/agenda-de-sessoes";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { SessoesSemConfirmacao } from "@/components/confirmacao/sessoes-sem-confirmacao";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSessao } from "@/lib/sessao";

const botaoAgendar = (
  <Link href="/agendar-sessao" className={buttonVariants()}>
    <CalendarPlus aria-hidden className="size-4" />
    Agendar sessão
  </Link>
);

function Cabecalho({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="ui-titulo">{titulo}</h1>
        <p className="ui-subtitulo">{subtitulo}</p>
      </div>
      {children}
    </div>
  );
}

// Agenda da secretaria, com as sessões sem confirmação (RF14).
function AgendaDaSecretaria() {
  return (
    <>
      <Cabecalho
        titulo="Agenda"
        subtitulo="Sessões de todos os estagiários. Os contatos dos pacientes ficam em Pacientes."
      >
        {botaoAgendar}
      </Cabecalho>
      <SessoesSemConfirmacao />
    </>
  );
}

// Agenda do estagiário (RF11): só as próprias sessões.
function AgendaDoEstagiario() {
  return (
    <>
      <Cabecalho
        titulo="Agenda"
        subtitulo="Suas sessões agendadas, confirmadas e realizadas."
      >
        {botaoAgendar}
      </Cabecalho>
      <AgendaDeSessoes />
    </>
  );
}

// Agenda dos estagiários do supervisor (RF11): o campo lista só os estagiários dele,
// e o escolhido fica no endereço (?estagiario=), para a página poder ser aberta de
// novo. Um estagiário de outro supervisor recebe o acesso negado da API.
function AgendaDosEstagiarios() {
  const router = useRouter();
  const parametros = useSearchParams();
  const lista = useQuery({
    queryKey: ["agenda", "estagiarios"],
    queryFn: () => api<EstagiarioDoSupervisor[]>("/agenda/estagiarios"),
    retry: false,
  });
  const escolhido = parametros.get("estagiario") ?? lista.data?.[0]?.id;
  const nome = lista.data?.find((e) => e.id === escolhido)?.nome;

  return (
    <>
      <Cabecalho
        titulo="Agenda dos estagiários"
        subtitulo="Sessões dos estagiários que você supervisiona."
      >
        {lista.data && lista.data.length > 0 && (
          <Campo
            rotulo="Estagiário"
            dica="Só os estagiários que você supervisiona."
            className="w-full sm:w-72"
          >
            {(props) => (
              <select
                {...props}
                value={nome ? escolhido : ""}
                onChange={(e) =>
                  router.replace(`/agenda?estagiario=${e.target.value}`)
                }
                className={classeEntrada}
              >
                {!nome && (
                  <option value="" disabled>
                    Escolha o estagiário
                  </option>
                )}
                {lista.data.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}
      </Cabecalho>
      {lista.isPending ? (
        <p role="status">Carregando…</p>
      ) : lista.isError ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar os estagiários.">
          Verifique a sua conexão e tente de novo.
        </Aviso>
      ) : !escolhido ? (
        <Aviso
          tipo="info"
          titulo="Você ainda não supervisiona nenhum estagiário."
        >
          A agenda aparece quando um caso seu tiver estagiário vinculado.
        </Aviso>
      ) : (
        <AgendaDeSessoes
          key={escolhido}
          estagiarioId={escolhido}
          titulo={nome ? `Agenda de ${nome}` : undefined}
        />
      )}
    </>
  );
}

function Agenda() {
  const { data: usuario, isPending } = useSessao();
  if (isPending) return <p role="status">Carregando…</p>;
  if (usuario?.perfil === "secretaria") return <AgendaDaSecretaria />;
  if (usuario?.perfil === "estagiario") return <AgendaDoEstagiario />;
  if (usuario?.perfil === "supervisor") return <AgendaDosEstagiarios />;
  notFound();
}

// Agenda: a secretaria vê as sessões sem confirmação (RF14); o estagiário e o
// supervisor, a agenda de sessões (RF11). A coordenação não tem agenda.
export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p role="status">Carregando…</p>}>
        <Agenda />
      </Suspense>
    </div>
  );
}
