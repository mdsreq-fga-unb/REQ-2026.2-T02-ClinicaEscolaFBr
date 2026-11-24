"use client";
import { useEffect, useState } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import type {
  AutorizacaoMenor,
  SessaoComPresenca,
  VerificacaoAtual,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import {
  AvisoDaEmissao,
  DeclaracaoNegada,
  PreVisualizacaoDeclaracao,
  useEmissaoDeclaracao,
} from "@/components/declaracoes/declaracao";
import { chaveAutorizacaoMenor } from "@/components/declaracoes/autorizacao-menor";
import { Button } from "@/components/ui/button";
import { VerificacaoIdentidade } from "@/components/verificacao/verificacao-identidade";
import { api, ErroApi } from "@/lib/api";
import { dataBr, horaBr } from "@/lib/formato";

export const TITULO_SESSOES = "Sessões com presença registrada";

const horario = (inicio: string) => horaBr(new Date(inicio));

// Botão "Emitir declaração" da sessão (RF45, prancha 8-3). O nome acessível diz a
// sessão; enquanto a emissão corre, os botões ficam desabilitados, e o da sessão
// em emissão mostra "Emitindo…".
function BotaoEmitir({
  sessao,
  aoEmitir,
  emitindo,
  className,
}: {
  sessao: SessaoComPresenca;
  aoEmitir: (sessao: SessaoComPresenca) => void;
  emitindo: string | null;
  className?: string;
}) {
  const estaEmitindo = emitindo === sessao.id;
  return (
    <Button
      data-emitir-sessao={sessao.id}
      className={className}
      disabled={emitindo !== null}
      aria-label={
        estaEmitindo
          ? undefined
          : `Emitir declaração da sessão de ${dataBr(sessao.inicio)}`
      }
      onClick={() => aoEmitir(sessao)}
    >
      {estaEmitindo ? "Emitindo…" : "Emitir declaração"}
    </Button>
  );
}

// Lista das sessões com presença registrada (RF44, prancha 8-2): tabela com
// legenda e cabeçalhos a partir de 640 px e cartões no celular (RNF56 a RNF58).
// Com `aoEmitir`, cada sessão ganha o botão "Emitir declaração" (RF45, prancha
// 8-3); sem ele, a lista é só de consulta.
export function ListaSessoesComPresenca({
  sessoes,
  legenda,
  aoEmitir,
  emitindo = null,
}: {
  sessoes: SessaoComPresenca[];
  legenda: string;
  aoEmitir?: (sessao: SessaoComPresenca) => void;
  // Id da sessão em emissão, se houver.
  emitindo?: string | null;
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
              {aoEmitir && <th scope="col">Declaração</th>}
            </tr>
          </thead>
          <tbody>
            {sessoes.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap">{dataBr(s.inicio)}</td>
                <td className="whitespace-nowrap">{horario(s.inicio)}</td>
                <td>{s.estagiario}</td>
                {aoEmitir && (
                  <td>
                    <BotaoEmitir
                      sessao={s}
                      aoEmitir={aoEmitir}
                      emitindo={emitindo}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label={legenda} className="ui-lista-celular sm:hidden">
        {sessoes.map((s) => (
          <li key={s.id} className="ui-item-celular gap-1">
            <span className="font-bold">
              {dataBr(s.inicio)}, {horario(s.inicio)}
            </span>
            <span className="text-sm text-muted-foreground">
              {s.estagiario}
            </span>
            {aoEmitir && (
              <BotaoEmitir
                sessao={s}
                aoEmitir={aoEmitir}
                emitindo={emitindo}
                className="mt-2 w-full"
              />
            )}
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
  // A emissão (RF45): o 401 pede a verificação de novo, como a lista.
  const emissao = useEmissaoDeclaracao({
    caminho: (sessaoId) => `/declaracoes/minhas-sessoes/${sessaoId}/emissao`,
    aoNaoAutenticado: () => setExpirada(true),
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
  if (emissao.previa)
    return (
      <PreVisualizacaoDeclaracao
        declaracao={emissao.previa}
        aoVoltar={emissao.voltar}
      />
    );
  if (emissao.negado) return <DeclaracaoNegada aoVoltar={emissao.voltar} />;
  return (
    <>
      <p className="ui-dica">
        Escolha a sessão para emitir a declaração de comparecimento. Só aparecem
        as sessões em que a presença foi registrada.
      </p>
      <AvisoDaEmissao emissao={emissao} />
      <ListaSessoesComPresenca
        sessoes={consulta.data}
        legenda={`${TITULO_SESSOES} da inscrição ${verificacao.numero}`}
        aoEmitir={(s) => emissao.emitir(s.id)}
        emitindo={emissao.emitindo}
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
// lista e emite a declaração (RNF38, RF45); para o estagiário, o supervisor e a
// coordenação, a API responde 403, e a seção mostra que a lista não é do perfil.
export function SessoesComPresencaDaFicha({ casoId }: { casoId: string }) {
  const consulta = useQuery({
    queryKey: ["pacientes", casoId, "sessoes-realizadas"],
    queryFn: () =>
      api<SessaoComPresenca[]>(`/pacientes/${casoId}/sessoes-realizadas`),
    retry: false,
  });
  const emissao = useEmissaoDeclaracao({
    caminho: (sessaoId) => `/declaracoes/sessoes/${sessaoId}/emissao`,
  });
  // Só observa a autorização que o bloco da ficha carrega e registra (sem
  // buscar): quando ela é registrada, o aviso de "autorização pendente" some.
  const autorizacaoRegistradaEm = useQuery({
    queryKey: chaveAutorizacaoMenor(casoId),
    queryFn: skipToken,
    select: (dados: AutorizacaoMenor) =>
      dados.autorizacao?.registradoEm ?? null,
  }).data;
  const { limparRecusa } = emissao;
  useEffect(() => {
    if (autorizacaoRegistradaEm) limparRecusa("autorizacao_pendente");
  }, [autorizacaoRegistradaEm, limparRecusa]);
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
  if (emissao.previa)
    return (
      <PreVisualizacaoDeclaracao
        declaracao={emissao.previa}
        aoVoltar={emissao.voltar}
      />
    );
  if (emissao.negado) return <DeclaracaoNegada aoVoltar={emissao.voltar} />;
  return (
    <section aria-labelledby="sessoes-presenca" className="ui-cartao">
      <h2 id="sessoes-presenca" className="ui-h2">
        {TITULO_SESSOES}
      </h2>
      <AvisoDaEmissao emissao={emissao} />
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
          aoEmitir={(s) => emissao.emitir(s.id)}
          emitindo={emissao.emitindo}
        />
      ) : (
        <p className="ui-dica">
          Ainda não há sessão com presença registrada para este paciente.
        </p>
      )}
    </section>
  );
}
