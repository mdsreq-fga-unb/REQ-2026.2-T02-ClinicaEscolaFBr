"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import type { SessaoComPresenca, VerificacaoAtual } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Button } from "@/components/ui/button";
import { VerificacaoIdentidade } from "@/components/verificacao/verificacao-identidade";
import { api, ErroApi } from "@/lib/api";
import { dataBr, horaBr } from "@/lib/formato";

export const TITULO_SESSOES = "Sessões com presença registrada";

// Proposta da equipe (prancha 8-2), até a emissão pelo sistema (RF45, Ciclo 6).
export const AVISO_EMISSAO =
  "A emissão da declaração pelo sistema ainda não está disponível. Para pedir a sua, procure a secretaria da clínica.";

const horario = (inicio: string) => horaBr(new Date(inicio));

// Lista das sessões com presença registrada (RF44, prancha 8-2): tabela com
// legenda e cabeçalhos a partir de 640 px e cartões no celular (RNF56 a RNF58).
// Só de consulta: a escolha da sessão para a declaração chega com o RF45.
export function ListaSessoesComPresenca({
  sessoes,
  legenda,
}: {
  sessoes: SessaoComPresenca[];
  legenda: string;
}) {
  return (
    <>
      <div className="ui-painel overflow-x-auto max-sm:hidden">
        <table className="ui-tabela">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Horário</th>
              <th scope="col">Estagiário</th>
            </tr>
          </thead>
          <tbody>
            {sessoes.map((s, i) => (
              <tr key={`${s.inicio}-${i}`}>
                <td className="whitespace-nowrap">{dataBr(s.inicio)}</td>
                <td className="whitespace-nowrap">{horario(s.inicio)}</td>
                <td>{s.estagiario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label={legenda} className="ui-lista-celular sm:hidden">
        {sessoes.map((s, i) => (
          <li key={`${s.inicio}-${i}`} className="ui-item-celular gap-1">
            <span className="font-bold">
              {dataBr(s.inicio)}, {horario(s.inicio)}
            </span>
            <span className="text-sm text-muted-foreground">
              {s.estagiario}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

// Estado vazio: um título com o texto, sem erro técnico (RF44).
export function SemSessoesComPresenca({ texto }: { texto: string }) {
  return (
    <div role="status" className="ui-cartao gap-1.5">
      <h2 className="ui-h2 text-foreground">
        Não há sessões disponíveis para declaração
      </h2>
      <p className="ui-dica">{texto}</p>
    </div>
  );
}

// Lista do paciente ou do responsável, depois da verificação do RF52. A API só
// usa a inscrição verificada (RNF6); quando a verificação vence ou é encerrada,
// a lista some e a tela pede a verificação de novo.
export function MinhasSessoes({
  verificacao,
}: {
  verificacao: VerificacaoAtual;
}) {
  // A verificação já vencida não chega a pedir a lista.
  const [expirada, setExpirada] = useState(
    () => Date.parse(verificacao.expiraEm) <= Date.now(),
  );
  useEffect(() => {
    const timer = setTimeout(
      () => setExpirada(true),
      Math.max(0, Date.parse(verificacao.expiraEm) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [verificacao.expiraEm]);
  const consulta = useQuery({
    queryKey: ["minhas-sessoes", verificacao.numero, verificacao.expiraEm],
    queryFn: () =>
      api<SessaoComPresenca[]>("/declaracoes/minhas-sessoes", {
        cache: "no-store",
      }),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    enabled: !expirada,
  });
  if (
    expirada ||
    (consulta.error instanceof ErroApi && consulta.error.status === 401)
  )
    return (
      <Aviso
        tipo="erro"
        titulo="Confirme sua identidade para ver as sessões."
        focar
      >
        <p>A verificação expirou ou foi encerrada.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Confirmar identidade
        </Button>
      </Aviso>
    );
  if (consulta.isError)
    return (
      <Aviso tipo="erro" titulo="Não foi possível carregar as sessões." focar>
        <Button variant="outline" onClick={() => void consulta.refetch()}>
          Tentar novamente
        </Button>
      </Aviso>
    );
  if (!consulta.data) return <p role="status">Carregando as sessões…</p>;
  if (!consulta.data.length)
    return (
      <SemSessoesComPresenca texto="Ainda não há sessão com presença registrada nesta inscrição." />
    );
  return (
    <>
      <p className="ui-dica">
        Só aparecem as sessões em que a presença foi registrada.
      </p>
      <Aviso tipo="info" titulo={AVISO_EMISSAO} />
      <ListaSessoesComPresenca
        sessoes={consulta.data}
        legenda={`${TITULO_SESSOES} da inscrição ${verificacao.numero}`}
      />
    </>
  );
}

// Página pública /declaracoes: os dois passos do RF52 e, depois, a lista.
export function DeclaracoesDoPaciente() {
  return (
    <VerificacaoIdentidade titulo={TITULO_SESSOES}>
      {(v) => <MinhasSessoes key={v.expiraEm} verificacao={v} />}
    </VerificacaoIdentidade>
  );
}

// Seção "Sessões com presença registrada" da ficha do paciente. Só a secretaria
// lista (RNF38), e a ficha só mostra a seção para ela. Se a API ainda assim
// responder 403 (por exemplo, perfil alterado durante o uso), a seção mostra
// que a lista não é do perfil.
export function SessoesComPresencaDaFicha({ casoId }: { casoId: string }) {
  const consulta = useQuery({
    queryKey: ["pacientes", casoId, "sessoes-realizadas"],
    queryFn: () =>
      api<SessaoComPresenca[]>(`/pacientes/${casoId}/sessoes-realizadas`),
    retry: false,
  });
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return (
      <section aria-labelledby="sessoes-presenca" className="ui-cartao gap-2">
        <Lock aria-hidden className="size-5 text-primary" />
        <h2 id="sessoes-presenca" className="ui-h2">
          Você não tem acesso a esta lista
        </h2>
        <p className="ui-dica">
          A lista de sessões é da secretaria e do próprio paciente ou
          responsável.
        </p>
      </section>
    );
  return (
    <section aria-labelledby="sessoes-presenca" className="ui-cartao">
      <h2 id="sessoes-presenca" className="ui-h2">
        {TITULO_SESSOES}
      </h2>
      {consulta.isPending ? (
        <p role="status">Carregando as sessões…</p>
      ) : consulta.isError ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar as sessões.">
          <Button variant="outline" onClick={() => void consulta.refetch()}>
            Tentar novamente
          </Button>
        </Aviso>
      ) : consulta.data.length ? (
        <ListaSessoesComPresenca
          sessoes={consulta.data}
          legenda={TITULO_SESSOES}
        />
      ) : (
        <p className="ui-dica">
          Ainda não há sessão com presença registrada para este paciente.
        </p>
      )}
    </section>
  );
}
