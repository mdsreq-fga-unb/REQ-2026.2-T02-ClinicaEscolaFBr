"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LIMITE_FALTAS_CICLO,
  type AcoesCancelamento,
  type ContagemFaltas,
  type DesligamentoDoCaso,
  type ResultadoDesligamento,
  type ResultadoReversao,
  type ResultadoVinculo,
  type ResponsaveisDoCaso,
  type ResultadoTransferencia,
  type SessaoAReagendar,
  type SituacaoCaso,
  situacaoDistribuicao,
} from "@clinica/shared";
import {
  DialogoDesligar,
  DialogoReverter,
  HistoricoDoCaso,
  SeloSituacaoCaso,
  SessoesAReagendar,
} from "@/components/assiduidade/desligamento";
import {
  HistoricoFaltas,
  ResumoFaltas,
  SessoesComFaltas,
  type SessaoDoCiclo,
} from "@/components/assiduidade/faltas";
import {
  QuadroResponsaveis,
  SeloDistribuicao,
} from "@/components/casos/responsaveis";
import {
  AvisoTransferencia,
  DialogoTransferir,
} from "@/components/casos/transferir";
import { DialogoVincular } from "@/components/casos/vincular";
import { AcessoNegado } from "@/components/comum/acesso-negado";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";
import { dataBr, dataHoraBr, NOMES_CANAL } from "@/lib/formato";

type DadosAdministrativos = {
  casoId: string;
  numeroInscricao: string;
  nome: string;
  dataNascimento: string;
  celular: string | null;
  email: string | null;
  canalPreferencial: keyof typeof NOMES_CANAL;
  responsavelLegal: string | null;
  situacao: SituacaoCaso;
  vinculadoEm: string | null;
  cicloDesde: string | null;
  proximaSessao: string | null;
  estagiario: string | null;
  ultimoEstagiario: string | null;
  supervisor: string | null;
  // Só vem para a coordenação, que consulta o prontuário (DF32).
  prontuarioId?: string | null;
  faltasNoCiclo: ContagemFaltas;
  cicloAtendimento: number;
  sessoes: SessaoDoCiclo[];
  acoesCancelamento: AcoesCancelamento;
  podeDesligar: boolean;
  desligamentos: DesligamentoDoCaso[];
  vagaDoDesligamento: { estagiario: string; livre: boolean } | null;
  sessoesAReagendar: SessaoAReagendar[];
};

type Resultado =
  | { tipo: "desligado"; dados: ResultadoDesligamento }
  | { tipo: "revertido"; dados: ResultadoReversao }
  | { tipo: "vinculado"; dados: ResultadoVinculo }
  | { tipo: "transferido"; dados: ResultadoTransferencia };

// Situações em que a coordenação transfere o caso a outro supervisor ou
// estagiário (RF25). O caso que aguarda distribuição vai pela distribuição (RF20).
const TRANSFERIVEIS: SituacaoCaso[] = [
  "em_atendimento",
  "aguardando_vinculo",
  "aguardando_vaga",
];

// Situações em que o supervisor do caso vincula o estagiário (RF21, RF38).
const VINCULAVEIS: SituacaoCaso[] = ["aguardando_vinculo", "aguardando_vaga"];

const celularBr = (c: string | null) =>
  c ? c.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : "—";

// Trilha de volta de cada perfil: a secretaria e a coordenação vêm da lista de
// Pacientes; o supervisor, de "Meus casos"; o estagiário, de "Meus pacientes".
const VOLTAR = {
  supervisor: { href: "/meus-casos", rotulo: "Meus casos" },
  estagiario: { href: "/meus-pacientes", rotulo: "Meus pacientes" },
} as const;

// Ficha do paciente. No topo, os responsáveis pelo caso (RF22), para a secretaria,
// a coordenação e o estagiário e o supervisor responsáveis. Para a secretaria e a
// coordenação, seguem os dados cadastrais e administrativos (RF55), com as faltas
// do ciclo (RF34, RF35), o desligamento por faltas (RF37) e a reversão (RF38). O
// estagiário e o supervisor, e o caso que ainda aguarda distribuição, veem só a
// identificação (prancha 2-3). O conteúdo clínico fica no prontuário.
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
  const [dialogo, setDialogo] = useState<
    "desligar" | "reverter" | "transferir" | null
  >(null);
  const cliente = useQueryClient();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const perfil = sessao?.perfil;
  const secretaria = perfil === "secretaria";
  const coordenacao = perfil === "coordenacao";
  const chave = ["paciente", casoId];
  const chaveResponsaveis = ["casos", casoId, "responsaveis"];
  const responsaveis = useQuery({
    queryKey: chaveResponsaveis,
    queryFn: () => api<ResponsaveisDoCaso>(`/casos/${casoId}/responsaveis`),
    enabled: Boolean(perfil),
    retry: false,
  });
  // A ficha completa só existe para a secretaria e a coordenação, e só depois da
  // distribuição: antes dela, a prancha mostra só a identificação.
  const fichaCompleta =
    (secretaria || coordenacao) &&
    responsaveis.data !== undefined &&
    responsaveis.data.situacao !== "aguardando_distribuicao";
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () =>
      api<DadosAdministrativos>(`/pacientes/${casoId}/dados-administrativos`),
    enabled: fichaCompleta,
    retry: false,
  });
  const voltar =
    perfil === "supervisor" || perfil === "estagiario"
      ? VOLTAR[perfil]
      : { href: "/pacientes", rotulo: "Pacientes" };

  if (
    !perfil ||
    responsaveis.isPending ||
    (fichaCompleta && consulta.isPending)
  )
    return <p role="status">Carregando…</p>;
  if (
    responsaveis.error instanceof ErroApi &&
    responsaveis.error.status === 403
  )
    return (
      <AcessoNegado
        titulo="Você não tem acesso a este caso"
        voltar={voltar.href}
        rotuloVoltar={voltar.rotulo}
      >
        Só o estagiário e o supervisor responsáveis, a secretaria e a
        coordenação consultam os responsáveis pelo caso. Se você acha que
        deveria ter acesso, fale com o supervisor do caso.
      </AcessoNegado>
    );
  if (
    responsaveis.isError ||
    (fichaCompleta && (consulta.isError || !consulta.data))
  )
    return <Aviso tipo="erro" titulo="Não foi possível abrir o paciente." />;
  const r = responsaveis.data!;

  const trilha = (
    <nav aria-label="Você está em" className="ui-trilha">
      <Link href={voltar.href}>{voltar.rotulo}</Link>
      <span aria-hidden>›</span>
      <span aria-current="page">{r.nome}</span>
    </nav>
  );
  const avisoVinculo = resultado?.tipo === "vinculado" && (
    <Aviso
      tipo="sucesso"
      focar
      titulo={`${resultado.dados.estagiario} agora é responsável pelo caso ${resultado.dados.numero}.`}
    >
      O prontuário do caso foi criado.
    </Aviso>
  );
  const avisoClinico = (
    <Aviso
      tipo="info"
      titulo="O conteúdo clínico não aparece para o seu perfil."
    >
      Anamnese, contrato terapêutico e registros de sessão são restritos ao
      estagiário responsável, ao seu supervisor e à coordenação.
    </Aviso>
  );
  // O supervisor do caso vincula o estagiário pelo quadro (prancha 2-3, RF21),
  // nas mesmas situações de "Meus casos": o caso desligado por faltas volta pela
  // reversão (RF38), e o encerrado não recebe estagiário. A transferência (RF25)
  // fica dentro do quadro, como na prancha 4-3.
  const vincula =
    perfil === "supervisor" &&
    Boolean(r.numero) &&
    VINCULAVEIS.includes(r.situacao);
  const quadro = (acoes?: ReactNode) => (
    <QuadroResponsaveis
      acoes={acoes}
      responsaveis={r}
      perfil={perfil}
      aoVincular={
        vincula
          ? () => {
              setResultado(null);
              setVinculando(true);
            }
          : undefined
      }
    />
  );
  const dialogoVincular = vinculando && vincula && r.numero && (
    <DialogoVincular
      caso={{ casoId: r.casoId, numero: r.numero, nome: r.nome }}
      aoFechar={() => setVinculando(false)}
      aoConcluir={(dados) => {
        setVinculando(false);
        setResultado({ tipo: "vinculado", dados });
        void cliente.invalidateQueries({ queryKey: ["casos"] });
        void cliente.invalidateQueries({ queryKey: ["estagiarios"] });
      }}
    />
  );

  if (!fichaCompleta)
    return (
      <div className="flex flex-col gap-6">
        {trilha}
        {avisoVinculo}
        <h1 className="ui-titulo">{r.nome}</h1>
        {secretaria && avisoClinico}
        {quadro()}
        <section aria-labelledby="identificacao" className="ui-cartao">
          <h2 id="identificacao" className="ui-h2">
            Identificação
          </h2>
          <Dados
            colunas={4}
            itens={[
              ["Paciente", r.nome],
              ...(r.numero
                ? ([["Inscrição", r.numero]] as [string, string][])
                : []),
              [
                "Situação de distribuição",
                <SeloDistribuicao
                  key="distribuicao"
                  situacao={situacaoDistribuicao(r)}
                />,
              ],
            ]}
          />
        </section>
        {dialogoVincular}
      </div>
    );

  const d = consulta.data!;
  const vigente = d.desligamentos.find((x) => x.revertidoEm === null);
  const desligado = d.situacao === "desligado_por_faltas";
  const ultimo = d.desligamentos[0];

  // O estagiário vigente fica no quadro de responsáveis. Aqui só aparece o vínculo
  // encerrado pelo desligamento (RF37) ou restaurado pela reversão (RF38).
  const estagiario =
    d.situacao === "aguardando_vaga" ? (
      "Aguardando vaga"
    ) : desligado && d.ultimoEstagiario ? (
      <span key="estagiario">
        {d.ultimoEstagiario}{" "}
        <span className="ui-meta font-normal">
          · vínculo encerrado em {dataBr(vigente?.decididoEm)}
        </span>
      </span>
    ) : d.estagiario && ultimo?.revertidoEm ? (
      <span key="estagiario">
        {d.estagiario}{" "}
        <span className="ui-meta font-normal">
          · vínculo restaurado em {dataBr(ultimo.revertidoEm)}
        </span>
      </span>
    ) : null;
  const proximaSessao = d.proximaSessao
    ? dataHoraBr(d.proximaSessao)
    : d.sessoesAReagendar.length
      ? "A reagendar"
      : "Nenhuma";

  return (
    <div className="flex flex-col gap-6">
      {trilha}

      {resultado?.tipo === "desligado" && (
        <Aviso
          tipo="sucesso"
          focar
          titulo={`Desligamento por faltas registrado: ${d.nome}.`}
        >
          O vínculo com {resultado.dados.estagiario ?? "o estagiário"} foi
          encerrado,{" "}
          {resultado.dados.sessoesCanceladas === 0
            ? "não havia sessões futuras para cancelar"
            : resultado.dados.sessoesCanceladas === 1
              ? "a sessão futura foi cancelada"
              : `as ${resultado.dados.sessoesCanceladas} sessões futuras foram canceladas`}{" "}
          e a vaga ficou liberada aguardando realocação.
        </Aviso>
      )}
      {resultado?.tipo === "transferido" && (
        <AvisoTransferencia resultado={resultado.dados} />
      )}
      {resultado?.tipo === "revertido" &&
        (resultado.dados.situacao === "em_atendimento" ? (
          <Aviso tipo="sucesso" focar titulo="Desligamento revertido.">
            {d.nome} voltou ao atendimento com {resultado.dados.estagiario}. A
            vaga liberada deixou de aparecer em “Distribuição de casos” e em
            “Meus casos” do supervisor.
            {resultado.dados.sessoesAReagendar > 0 &&
              " As sessões canceladas ficaram para reagendar."}
          </Aviso>
        ) : (
          <Aviso
            tipo="alerta"
            focar
            titulo="Reversão pendente de tratamento manual da vaga."
          >
            A vaga do estagiário não está mais disponível. O caso aguarda vaga,
            e o supervisor vincula um estagiário em “Meus casos”.
          </Aviso>
        ))}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ui-titulo">{d.nome}</h1>
            <SeloSituacaoCaso situacao={d.situacao} />
          </div>
          {desligado && vigente && (
            <p className="ui-subtitulo m-0">
              Decisão registrada por {vigente.decididoPor} em{" "}
              {dataHoraBr(vigente.decididoEm).replace(", ", ", às ")}.
            </p>
          )}
        </div>
        {coordenacao && (
          <div className="flex flex-wrap gap-3 max-sm:w-full max-sm:[&>*]:w-full">
            {d.prontuarioId && (
              <Link
                href={`/prontuarios/${d.prontuarioId}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Ver prontuário
              </Link>
            )}
            {desligado && vigente && (
              <Button
                onClick={() => {
                  setResultado(null);
                  setDialogo("reverter");
                }}
              >
                Reverter desligamento
              </Button>
            )}
          </div>
        )}
      </div>

      {d.prontuarioId === undefined && avisoClinico}
      {quadro(
        coordenacao && d.supervisor && TRANSFERIVEIS.includes(d.situacao) ? (
          <Button
            variant="outline"
            onClick={() => {
              setResultado(null);
              setDialogo("transferir");
            }}
          >
            Transferir caso
          </Button>
        ) : undefined,
      )}
      {/* Lado a lado só a partir de 1024 px: com o menu, em 768 px cada cartão
          ficaria com uns 200 px, e os dados quebrariam no meio das palavras. */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
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
                <SeloSituacaoCaso key="situacao" situacao={d.situacao} />,
              ],
              [
                "Ciclo de atendimento",
                d.cicloDesde
                  ? `Ciclo ${d.cicloAtendimento} · desde ${dataBr(d.cicloDesde)}`
                  : `Ciclo ${d.cicloAtendimento}`,
              ],
              [
                "Sessões realizadas",
                String(
                  d.sessoes.filter((s) => s.status === "realizada").length,
                ),
              ],
              ["Próxima sessão", proximaSessao],
              ...(estagiario
                ? ([["Estagiário", estagiario]] as [string, ReactNode][])
                : []),
            ]}
          />
          <ResumoFaltas
            contagem={d.faltasNoCiclo}
            nome={d.nome}
            linkHistorico="#historico-faltas"
            semAviso={d.situacao !== "em_atendimento"}
          />
        </section>
      </div>
      <HistoricoFaltas
        id="historico-faltas"
        contagem={d.faltasNoCiclo}
        ciclo={d.cicloAtendimento}
        sessoes={d.sessoes}
        rodape={
          d.podeDesligar ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Button
                variant="destructive"
                className="w-fit max-sm:w-full"
                onClick={() => {
                  setResultado(null);
                  setDialogo("desligar");
                }}
              >
                Desligar por faltas
              </Button>
            </div>
          ) : desligado && vigente ? (
            <p className="ui-dica border-t border-border pt-4">
              Desligamento por faltas registrado por {vigente.decididoPor} em{" "}
              {dataHoraBr(vigente.decididoEm).replace(", ", ", às ")}.
            </p>
          ) : (secretaria || coordenacao) &&
            d.situacao === "em_atendimento" &&
            d.faltasNoCiclo.faltas > 0 ? (
            <Aviso
              tipo="info"
              titulo={`O desligamento por faltas só fica disponível quando o paciente atinge o limite de ${LIMITE_FALTAS_CICLO} faltas no ciclo.`}
            />
          ) : null
        }
      />
      <SessoesAReagendar
        casoId={d.casoId}
        sessoes={d.sessoesAReagendar}
        desligamento={ultimo}
        podeAgendar={secretaria}
      />
      <HistoricoDoCaso desligamentos={d.desligamentos} />
      <section aria-labelledby="sessoes-ciclo" className="ui-cartao">
        <h2 id="sessoes-ciclo" className="ui-h2">
          Sessões do ciclo
        </h2>
        <SessoesComFaltas
          nome={d.nome}
          sessoes={d.sessoes}
          limite={d.faltasNoCiclo.limite}
          agora={agora}
          podeRegistrar={secretaria && d.situacao === "em_atendimento"}
          podeJustificar={secretaria}
          chave={chave}
          acoesCancelamento={d.acoesCancelamento}
          casoId={d.casoId}
        />
      </section>
      {secretaria && d.situacao === "em_atendimento" && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/agendar-sessao?caso=${d.casoId}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Agendar sessão
          </Link>
        </div>
      )}

      {dialogo === "desligar" && sessao && (
        <DialogoDesligar
          casoId={d.casoId}
          nome={d.nome}
          numero={d.numeroInscricao}
          ciclo={d.cicloAtendimento}
          desde={d.cicloDesde}
          sessoes={d.sessoes}
          estagiario={d.estagiario}
          responsavel={{ nome: sessao.nome, perfil: sessao.perfil }}
          chave={chave}
          aoFechar={() => setDialogo(null)}
          aoConcluir={(dados) => {
            setDialogo(null);
            setResultado({ tipo: "desligado", dados });
          }}
        />
      )}
      {dialogo === "transferir" && (
        <DialogoTransferir
          casoId={d.casoId}
          coordenacao
          aoFechar={() => setDialogo(null)}
          aoConcluir={(dados) => {
            setDialogo(null);
            setResultado({ tipo: "transferido", dados });
            void cliente.invalidateQueries({ queryKey: chave });
            void cliente.invalidateQueries({ queryKey: ["casos"] });
          }}
        />
      )}
      {dialogo === "reverter" && vigente && (
        <DialogoReverter
          nome={d.nome}
          numero={d.numeroInscricao}
          desligamento={vigente}
          sessoes={d.sessoes}
          vaga={d.vagaDoDesligamento}
          chave={chave}
          aoFechar={() => setDialogo(null)}
          aoConcluir={(dados) => {
            setDialogo(null);
            setResultado({ tipo: "revertido", dados });
          }}
        />
      )}
    </div>
  );
}
