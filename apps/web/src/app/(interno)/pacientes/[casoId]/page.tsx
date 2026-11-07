"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ContagemFaltas } from "@clinica/shared";
import {
  HistoricoFaltas,
  ResumoFaltas,
  SessoesComFaltas,
  type SessaoDoCiclo,
} from "@/components/assiduidade/faltas";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSessao } from "@/lib/sessao";
import {
  dataBr,
  dataHoraBr,
  NOMES_CANAL,
  NOMES_SITUACAO_CASO,
} from "@/lib/formato";

type DadosAdministrativos = {
  casoId: string;
  nome: string;
  dataNascimento: string;
  celular: string | null;
  email: string | null;
  canalPreferencial: keyof typeof NOMES_CANAL;
  responsavelLegal: string | null;
  situacao: keyof typeof NOMES_SITUACAO_CASO;
  vinculadoEm: string | null;
  proximaSessao: string | null;
  estagiario: string | null;
  supervisor: string | null;
  // Só vem para a coordenação, que consulta o prontuário (DF32).
  prontuarioId?: string | null;
  faltasNoCiclo: ContagemFaltas;
  cicloAtendimento: number;
  sessoes: SessaoDoCiclo[];
};

const celularBr = (c: string | null) =>
  c ? c.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : "—";

// Dados cadastrais e administrativos (RF55). O conteúdo clínico fica no prontuário,
// que a coordenação abre por aqui e a secretaria não vê.
export default function PacientePage() {
  const { casoId } = useParams<{ casoId: string }>();
  const { data: sessao } = useSessao();
  // Horário de referência para saber se a sessão já começou e aceita a falta,
  // atualizado a cada minuto.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(relogio);
  }, []);
  const consulta = useQuery({
    queryKey: ["paciente", casoId],
    queryFn: () =>
      api<DadosAdministrativos>(`/pacientes/${casoId}/dados-administrativos`),
    retry: false,
  });
  if (consulta.isPending) return <p role="status">Carregando…</p>;
  if (consulta.isError || !consulta.data)
    return <Aviso tipo="erro" titulo="Não foi possível abrir o paciente." />;
  const d = consulta.data;
  const secretaria = sessao?.perfil === "secretaria";
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href="/pacientes">Pacientes</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">{d.nome}</span>
      </nav>
      <h1 className="ui-titulo">{d.nome}</h1>
      {d.prontuarioId === undefined && (
        <Aviso
          tipo="info"
          titulo="O conteúdo clínico não aparece para o seu perfil."
        >
          Anamnese, contrato terapêutico e registros de sessão são restritos ao
          estagiário responsável, ao seu supervisor e à coordenação.
        </Aviso>
      )}
      <div className="grid items-start gap-5 md:grid-cols-2">
        <section aria-labelledby="cadastrais" className="ui-cartao">
          <h2 id="cadastrais" className="ui-h2">
            Dados cadastrais
          </h2>
          <Dados
            colunas={2}
            itens={[
              ["Nome", d.nome],
              ["Data de nascimento", dataBr(d.dataNascimento)],
              ["Celular", celularBr(d.celular)],
              ["E-mail", d.email ?? "—"],
              ["Canal preferencial", NOMES_CANAL[d.canalPreferencial]],
              ["Responsável legal", d.responsavelLegal ?? "Não se aplica"],
            ]}
          />
        </section>
        <section aria-labelledby="administrativos" className="ui-cartao">
          <h2 id="administrativos" className="ui-h2">
            Dados administrativos
          </h2>
          <Dados
            colunas={2}
            itens={[
              [
                "Situação do caso",
                <span
                  key="situacao"
                  className="ui-selo border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]"
                >
                  {NOMES_SITUACAO_CASO[d.situacao]}
                </span>,
              ],
              [
                "Ciclo de atendimento",
                d.vinculadoEm ? `Desde ${dataBr(d.vinculadoEm)}` : "—",
              ],
              [
                "Sessões realizadas",
                String(
                  d.sessoes.filter((s) => s.status === "realizada").length,
                ),
              ],
              ["Próxima sessão", dataHoraBr(d.proximaSessao)],
              ["Estagiário", d.estagiario ?? "—"],
              ["Supervisor", d.supervisor ?? "—"],
            ]}
          />
          <ResumoFaltas
            contagem={d.faltasNoCiclo}
            nome={d.nome}
            linkHistorico="#historico-faltas"
          />
        </section>
      </div>
      <HistoricoFaltas
        id="historico-faltas"
        contagem={d.faltasNoCiclo}
        ciclo={d.cicloAtendimento}
        sessoes={d.sessoes}
      />
      <section aria-labelledby="sessoes-ciclo" className="ui-cartao">
        <h2 id="sessoes-ciclo" className="ui-h2">
          Sessões do ciclo
        </h2>
        <SessoesComFaltas
          nome={d.nome}
          sessoes={d.sessoes}
          limite={d.faltasNoCiclo.limite}
          agora={agora}
          podeRegistrar={secretaria}
          podeJustificar={secretaria}
          chave={["paciente", casoId]}
        />
      </section>
      <div className="flex flex-wrap gap-3">
        {d.prontuarioId && (
          <Link
            href={`/prontuarios/${d.prontuarioId}`}
            className={buttonVariants()}
          >
            Ver prontuário
          </Link>
        )}
        {sessao?.perfil === "secretaria" && (
          <Link
            href={`/agendar-sessao?caso=${d.casoId}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Agendar sessão
          </Link>
        )}
      </div>
    </div>
  );
}
