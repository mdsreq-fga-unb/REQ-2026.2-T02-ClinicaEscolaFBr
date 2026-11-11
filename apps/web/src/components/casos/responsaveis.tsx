"use client";
import { useQuery } from "@tanstack/react-query";
import type { ResponsaveisDoCaso } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import { api } from "@/lib/api";

// Responsável que ainda não existe: o texto vem sem nome (RF22).
export function PendenteDeDistribuicao() {
  return (
    <span className="text-muted-foreground italic">
      Pendente de distribuição
    </span>
  );
}

// Nome do responsável, ou a indicação de que o caso ainda não tem um.
export function NomeDoResponsavel({ nome }: { nome: string | null }) {
  return nome ? <>{nome}</> : <PendenteDeDistribuicao />;
}

// Quadro "Responsáveis" da ficha do paciente (RF22): só os nomes do supervisor e do
// estagiário, sem dado clínico (RNF17).
export function QuadroResponsaveis({ casoId }: { casoId: string }) {
  const consulta = useQuery({
    queryKey: ["casos", casoId, "responsaveis"],
    queryFn: () => api<ResponsaveisDoCaso>(`/casos/${casoId}/responsaveis`),
    retry: false,
  });
  return (
    <section aria-labelledby="responsaveis" className="ui-cartao">
      <h2 id="responsaveis" className="ui-h2">
        Responsáveis
      </h2>
      {consulta.isPending && <p role="status">Carregando responsáveis…</p>}
      {consulta.isError && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar os responsáveis."
        />
      )}
      {consulta.data && (
        <Dados
          colunas={2}
          itens={[
            [
              "Supervisor",
              <NomeDoResponsavel
                key="supervisor"
                nome={consulta.data.supervisor}
              />,
            ],
            [
              "Estagiário",
              <NomeDoResponsavel
                key="estagiario"
                nome={consulta.data.estagiario}
              />,
            ],
          ]}
        />
      )}
    </section>
  );
}
