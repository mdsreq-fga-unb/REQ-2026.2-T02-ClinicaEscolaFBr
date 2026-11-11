"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  anamneseSchema,
  CAMPOS_EVOLUCAO,
  contratoSchema,
  evolucaoSchema,
  LIMITE_CAMPO_CLINICO,
  SECOES_ANAMNESE,
  type Anamnese,
  type CampoEvolucao,
  type Contrato,
  type Evolucao,
  type SecaoAnamnese,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import {
  Campo,
  classeEntrada,
  classeTextoLongo,
} from "@/components/comum/campo";
import { Dados } from "@/components/comum/dados";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr } from "@/lib/formato";

type ErrosDe<T> = Partial<Record<keyof T, string>>;

// Erros do esquema compartilhado, um por campo (RNF1).
function errosPorCampo<T>(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: ErrosDe<T> = {};
  for (const problema of issues) {
    const campo = problema.path[0] as keyof T;
    erros[campo] ??= problema.message;
  }
  return erros;
}

const NAO_INFORMADO = "Não informado";
const milhar = (n: number) => n.toLocaleString("pt-BR");
const DICAS_SECAO: Record<SecaoAnamnese, string> = {
  queixaPrincipal: "Trazido da inscrição. Você pode completar.",
  historiaProblemaAtual:
    "Descreva o início, o curso e os impactos do problema atual.",
  historicoFamiliar: "Registre informações relevantes sobre a família.",
  desenvolvimento: "Registre aspectos relevantes do desenvolvimento.",
  historicoMedico: "Inclua histórico de saúde e tratamentos relevantes.",
  aspectosPsicossociais:
    "Registre contexto social, familiar, escolar e de trabalho.",
};

function focarPrimeiroErro() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  });
}

// Envio com o botão travado enquanto a resposta não chega, para não registrar duas
// vezes; a resposta 409 de um segundo envio aparece como erro do formulário.
function useEnvio(prontuarioId: string) {
  const cache = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  async function enviar(
    caminho: string,
    corpo: unknown,
    aoConcluir?: (resultado: unknown) => void,
    aoConflitar?: () => void,
  ) {
    setErro(null);
    setSalvando(true);
    try {
      const resultado = await api<unknown>(
        `/prontuarios/${prontuarioId}${caminho}`,
        {
          method: "POST",
          body: JSON.stringify(corpo),
        },
      );
      aoConcluir?.(resultado);
      await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível salvar.",
      );
      if (falha instanceof ErroApi && falha.status === 409) {
        aoConflitar?.();
        await cache.invalidateQueries({
          queryKey: ["prontuario", prontuarioId],
        });
      }
    } finally {
      setSalvando(false);
    }
  }
  return { erro, salvando, enviar };
}

// Texto longo com o contador de caracteres na dica (RF28, RF69).
function CampoTexto({
  rotulo,
  opcional = false,
  valor,
  erro,
  aoMudar,
}: {
  rotulo: string;
  opcional?: boolean;
  valor: string;
  erro?: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <Campo
      rotulo={opcional ? `${rotulo} (opcional)` : rotulo}
      dica={`${milhar(valor.length)} de ${milhar(LIMITE_CAMPO_CLINICO)} caracteres`}
      dicaClassName={
        valor.length > LIMITE_CAMPO_CLINICO
          ? "font-semibold text-destructive"
          : undefined
      }
      erro={erro}
    >
      {(props) => (
        <textarea
          {...props}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className={classeTextoLongo}
        />
      )}
    </Campo>
  );
}

function Texto({ valor }: { valor: string | null }) {
  return (
    <p className="rounded-lg border border-border bg-muted p-3 text-[15px] leading-[1.55] whitespace-pre-wrap">
      {valor ?? NAO_INFORMADO}
    </p>
  );
}

// Anamnese nas seis seções da ficha da clínica (RF69, DF37), com a queixa principal
// preenchida pela queixa da inscrição.
export function FormularioAnamnese({
  prontuarioId,
  queixaDaInscricao,
}: {
  prontuarioId: string;
  queixaDaInscricao: string | null;
}) {
  const [dados, setDados] = useState<Record<SecaoAnamnese, string>>(() => ({
    queixaPrincipal: queixaDaInscricao ?? "",
    historiaProblemaAtual: "",
    historicoFamiliar: "",
    desenvolvimento: "",
    historicoMedico: "",
    aspectosPsicossociais: "",
  }));
  const [erros, setErros] = useState<ErrosDe<Anamnese>>({});
  const { erro, salvando, enviar } = useEnvio(prontuarioId);

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = anamneseSchema.safeParse(dados);
    if (!resultado.success) {
      setErros(errosPorCampo<Anamnese>(resultado.error.issues));
      focarPrimeiroErro();
      return;
    }
    setErros({});
    void enviar("/anamnese", resultado.data);
  }

  return (
    <form
      noValidate
      onSubmit={salvar}
      aria-labelledby="titulo-anamnese"
      className="flex flex-col gap-4"
    >
      <h3 id="titulo-anamnese" className="ui-rotulo">
        Anamnese
      </h3>
      <p className="ui-dica">
        Segue a ficha de anamnese da Clínica Escola. Só a queixa principal é
        obrigatória; as seções em branco ficam como “{NAO_INFORMADO}”. Depois de
        salva, a anamnese não pode ser alterada.
      </p>
      {Object.keys(erros).length > 0 && (
        <Aviso
          tipo="erro"
          titulo="A anamnese não foi salva. Corrija o campo indicado. O que você já escreveu foi mantido."
        />
      )}
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <div className="grid gap-4 min-[1366px]:grid-cols-2">
        {SECOES_ANAMNESE.map(([secao, rotulo], indice) => (
          <div key={secao} className="flex min-w-0 flex-col gap-2">
            <p className="ui-rotulo">
              {["I", "II", "III", "IV", "V", "VI"][indice]} · {rotulo}
            </p>
            <p className="ui-dica">{DICAS_SECAO[secao]}</p>
            <CampoTexto
              rotulo={rotulo}
              opcional={secao !== "queixaPrincipal"}
              valor={dados[secao]}
              erro={erros[secao]}
              aoMudar={(valor) => setDados({ ...dados, [secao]: valor })}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar anamnese"}
        </Button>
      </div>
    </form>
  );
}

export function LeituraAnamnese({
  anamnese,
}: {
  anamnese: Anamnese & {
    registradaEm: string | null;
    registradaPor: string | null;
  };
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="ui-rotulo">Anamnese</h3>
      {SECOES_ANAMNESE.map(([secao, rotulo]) => (
        <div key={secao} className="flex flex-col gap-1.5">
          <h4 className="text-[13px] font-semibold text-muted-foreground">
            {rotulo}
          </h4>
          <Texto valor={anamnese[secao]} />
        </div>
      ))}
      <p className="ui-meta">
        Registrada por{" "}
        {anamnese.registradaPor ?? "responsável não identificado"} em{" "}
        {dataHoraBr(anamnese.registradaEm)}
      </p>
    </div>
  );
}

// Contrato da Clínica Escola, assinado em papel na primeira sessão (RF69, DF41).
export function FormularioContrato({ prontuarioId }: { prontuarioId: string }) {
  const [dados, setDados] = useState({
    dataAssinaturaContrato: "",
    aceiteTclePesquisa: false,
    viaContratoGuardada: false,
  });
  const [erros, setErros] = useState<ErrosDe<Contrato>>({});
  const { erro, salvando, enviar } = useEnvio(prontuarioId);

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = contratoSchema.safeParse(dados);
    if (!resultado.success) {
      setErros(errosPorCampo<Contrato>(resultado.error.issues));
      focarPrimeiroErro();
      return;
    }
    setErros({});
    void enviar("/contrato", resultado.data);
  }

  return (
    <form
      noValidate
      onSubmit={salvar}
      aria-labelledby="titulo-contrato"
      className="flex min-w-0 flex-col gap-4 rounded-[12px] border border-border bg-muted p-4"
    >
      <h3 id="titulo-contrato" className="ui-rotulo">
        Contrato terapêutico
      </h3>
      <p className="ui-dica">
        O contrato é o “Contrato de Prestação de Serviço” da Clínica Escola,
        assinado em papel na primeira sessão. Registre aqui a assinatura e a
        guarda da via.
      </p>
      {Object.keys(erros).length > 0 && (
        <Aviso
          tipo="erro"
          titulo="O contrato não foi salvo. Corrija o campo indicado. O que você já escreveu foi mantido."
        />
      )}
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <Campo
        rotulo="Data de assinatura do contrato"
        erro={erros.dataAssinaturaContrato}
        className="max-w-[280px]"
      >
        {(props) => (
          <input
            {...props}
            type="date"
            value={dados.dataAssinaturaContrato}
            onChange={(e) =>
              setDados({ ...dados, dataAssinaturaContrato: e.target.value })
            }
            className={classeEntrada}
          />
        )}
      </Campo>
      <label className="flex cursor-pointer items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          checked={dados.aceiteTclePesquisa}
          onChange={(e) =>
            setDados({ ...dados, aceiteTclePesquisa: e.target.checked })
          }
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>
          O paciente aceitou o termo de consentimento livre e esclarecido para
          pesquisa
          <span className="ui-meta"> (opcional)</span>
        </span>
      </label>
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={dados.viaContratoGuardada}
            aria-invalid={erros.viaContratoGuardada ? true : undefined}
            aria-describedby={
              erros.viaContratoGuardada ? "via-guardada-erro" : undefined
            }
            onChange={(e) =>
              setDados({ ...dados, viaContratoGuardada: e.target.checked })
            }
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>A via assinada do contrato está guardada na clínica</span>
        </label>
        {erros.viaContratoGuardada && (
          <p
            id="via-guardada-erro"
            className="text-sm font-semibold text-destructive"
          >
            {erros.viaContratoGuardada}
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar contrato"}
        </Button>
      </div>
    </form>
  );
}

export function LeituraContrato({
  contrato,
}: {
  contrato: {
    textoLivre: string | null;
    dataAssinatura: string | null;
    aceiteTclePesquisa: boolean | null;
    viaGuardada: boolean | null;
    registradoEm: string | null;
    registradoPor: string | null;
  };
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="ui-rotulo">Contrato terapêutico</h3>
      {/* Registros anteriores à DF41 têm o contrato em texto livre. */}
      {contrato.textoLivre && <Texto valor={contrato.textoLivre} />}
      <Dados
        itens={[
          [
            "Data de assinatura do contrato",
            contrato.dataAssinatura
              ? dataBr(contrato.dataAssinatura)
              : NAO_INFORMADO,
          ],
          [
            "Termo de consentimento para pesquisa",
            contrato.aceiteTclePesquisa === null
              ? NAO_INFORMADO
              : contrato.aceiteTclePesquisa
                ? "Aceito"
                : "Não aceito",
          ],
          [
            "Via assinada",
            contrato.viaGuardada ? "Guardada na clínica" : NAO_INFORMADO,
          ],
        ]}
      />
      <p className="ui-meta">
        Registrado por{" "}
        {contrato.registradoPor ?? "responsável não identificado"} em{" "}
        {dataHoraBr(contrato.registradoEm)}
      </p>
    </div>
  );
}

// Dados da sessão de origem, só para leitura: não são digitados de novo (RF28).
function DadosDaSessao({
  numeroNoCiclo,
  inicio,
  paciente,
  estagiario,
  supervisor,
}: {
  numeroNoCiclo: number | null;
  inicio: string;
  paciente?: string;
  estagiario?: string;
  supervisor?: string;
}) {
  return (
    <Dados
      itens={[
        ...(paciente ? [["Paciente", paciente] as [string, string]] : []),
        ["Sessão no ciclo", numeroNoCiclo ? `${numeroNoCiclo}ª` : "—"],
        ["Data e horário", dataHoraBr(inicio)],
        ["Comparecimento", "Sim"],
        ...(estagiario ? [["Estagiário", estagiario] as [string, string]] : []),
        ...(supervisor ? [["Supervisor", supervisor] as [string, string]] : []),
      ]}
    />
  );
}

// Evolução da sessão realizada, na ficha "Registro de evolução" (RF28, DF38).
export function FormularioEvolucao({
  prontuarioId,
  sessaoId,
  inicio,
  numeroNoCiclo,
  paciente,
  estagiario,
  supervisor,
  aoRegistrar,
  aoConflitar,
  ocultarDadosDaSessao = false,
}: {
  prontuarioId: string;
  sessaoId: string;
  inicio: string;
  numeroNoCiclo: number | null;
  paciente?: string;
  estagiario?: string;
  supervisor?: string;
  aoRegistrar?: (resultado: {
    numeroNoCiclo: number;
    fechamentoAvaliativo: boolean;
  }) => void;
  aoConflitar?: () => void;
  ocultarDadosDaSessao?: boolean;
}) {
  const [dados, setDados] = useState<Record<CampoEvolucao, string>>({
    humorAparencia: "",
    conteudoTrabalhado: "",
    tecnicasUtilizadas: "",
    intervencoesEncaminhamentos: "",
    planoProximaSessao: "",
  });
  const [erros, setErros] = useState<ErrosDe<Evolucao>>({});
  const { erro, salvando, enviar } = useEnvio(prontuarioId);

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = evolucaoSchema.safeParse(dados);
    if (!resultado.success) {
      setErros(errosPorCampo<Evolucao>(resultado.error.issues));
      focarPrimeiroErro();
      return;
    }
    setErros({});
    void enviar(
      `/sessoes/${sessaoId}/evolucoes`,
      resultado.data,
      (resposta) => {
        if (
          typeof resposta === "object" &&
          resposta !== null &&
          "numeroNoCiclo" in resposta &&
          "fechamentoAvaliativo" in resposta
        ) {
          aoRegistrar?.(
            resposta as {
              numeroNoCiclo: number;
              fechamentoAvaliativo: boolean;
            },
          );
        }
      },
      aoConflitar,
    );
  }

  return (
    <form
      noValidate
      onSubmit={salvar}
      className="mt-4 flex flex-col gap-4 rounded-[12px] border border-border bg-muted p-4"
    >
      <h4 className="text-[15px] font-bold text-marca">
        Registro de evolução · sessão de {dataHoraBr(inicio)}
      </h4>
      {!ocultarDadosDaSessao && (
        <DadosDaSessao
          numeroNoCiclo={numeroNoCiclo}
          inicio={inicio}
          paciente={paciente}
          estagiario={estagiario}
          supervisor={supervisor}
        />
      )}
      <p className="ui-dica">
        O registro fica vinculado a esta sessão e não pode ser alterado depois
        de salvo.
      </p>
      {Object.keys(erros).length > 0 && (
        <Aviso
          tipo="erro"
          titulo="A evolução não foi salva. Corrija o campo indicado. O que você já escreveu foi mantido."
        />
      )}
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <div className="grid gap-4 min-[1366px]:grid-cols-2">
        {CAMPOS_EVOLUCAO.map(([campo, rotulo]) => (
          <CampoTexto
            key={campo}
            rotulo={rotulo}
            opcional={campo === "intervencoesEncaminhamentos"}
            valor={dados[campo]}
            erro={erros[campo]}
            aoMudar={(valor) => setDados({ ...dados, [campo]: valor })}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar evolução"}
        </Button>
      </div>
    </form>
  );
}

export type EvolucaoRegistrada = Record<CampoEvolucao, string | null> & {
  id: string;
  queixa: string | null;
  planejamento: string | null;
  registradaPor: string;
  registradaEm: string;
};

export function LeituraEvolucao({
  evolucao,
  inicio,
  numeroNoCiclo,
}: {
  evolucao: EvolucaoRegistrada;
  inicio: string;
  numeroNoCiclo: number | null;
}) {
  // Evoluções anteriores à DF38 aparecem com os rótulos antigos, sem migração.
  const campos: [string, string | null][] =
    evolucao.humorAparencia !== null
      ? CAMPOS_EVOLUCAO.map(([campo, rotulo]) => [rotulo, evolucao[campo]])
      : [
          ["Evolução da queixa", evolucao.queixa],
          ["Planejamento", evolucao.planejamento],
        ];
  return (
    <div className="mt-2 flex flex-col gap-3 text-[15px]">
      <DadosDaSessao numeroNoCiclo={numeroNoCiclo} inicio={inicio} />
      <dl className="flex flex-col gap-2">
        {campos.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="font-semibold">{rotulo}</dt>
            <dd className="whitespace-pre-wrap">{valor ?? NAO_INFORMADO}</dd>
          </div>
        ))}
      </dl>
      <p className="ui-meta">
        Registrada por {evolucao.registradaPor} em{" "}
        {dataHoraBr(evolucao.registradaEm)}
      </p>
    </div>
  );
}
