"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
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
};

const celularBr = (c: string | null) =>
  c ? c.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : "—";

// Dados cadastrais e administrativos, sem conteúdo clínico (RF55).
export default function PacientePage() {
  const { casoId } = useParams<{ casoId: string }>();
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
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/pacientes" className="text-primary underline">
          Pacientes
        </Link>{" "}
        › {d.nome}
      </nav>
      <h1 className="text-2xl font-semibold text-marca">{d.nome}</h1>
      <Aviso
        tipo="info"
        titulo="O conteúdo clínico não aparece para o seu perfil."
      >
        Anamnese, contrato terapêutico e registros de sessão são restritos ao
        estagiário responsável e ao seu supervisor.
      </Aviso>
      <div className="grid gap-4 md:grid-cols-2">
        <section
          aria-labelledby="cadastrais"
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2 id="cadastrais" className="mb-4 font-semibold text-marca">
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
        <section
          aria-labelledby="administrativos"
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2 id="administrativos" className="mb-4 font-semibold text-marca">
            Dados administrativos
          </h2>
          <Dados
            colunas={2}
            itens={[
              ["Situação do caso", NOMES_SITUACAO_CASO[d.situacao]],
              [
                "Ciclo de atendimento",
                d.vinculadoEm ? `Desde ${dataBr(d.vinculadoEm)}` : "—",
              ],
              ["Próxima sessão", dataHoraBr(d.proximaSessao)],
              ["Estagiário", d.estagiario ?? "—"],
              ["Supervisor", d.supervisor ?? "—"],
            ]}
          />
        </section>
      </div>
      <Link
        href={`/agendar-sessao?caso=${d.casoId}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "border-primary text-primary",
        )}
      >
        Agendar sessão
      </Link>
    </div>
  );
}
