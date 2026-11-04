"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  comprovanteSchema,
  dadosInscricaoSchema,
  ESTADOS_CIVIS,
  inscricaoSchema,
  menorDeIdade,
  triagemInscricaoSchema,
  type ComprovanteInscricao,
} from "@clinica/shared";
import styles from "./inscricao.module.css";

// A ordem dos rótulos é a ordem da revisão.
const rotulos = {
  nomeCompleto: "Nome completo",
  dataNascimento: "Data de nascimento",
  estadoCivil: "Estado civil",
  sexo: "Sexo",
  profissao: "Profissão",
  escolaridade: "Escolaridade",
  cpf: "CPF",
  rg: "RG",
  endereco: "Endereço",
  bairro: "Bairro",
  cidadeUf: "Cidade/UF",
  cep: "CEP",
  responsavelLegal: "Nome do responsável legal",
  cpfResponsavel: "CPF do responsável",
  documentoResponsavel: "Documento que comprova a responsabilidade",
  celular: "Telefone celular com DDD",
  whatsapp: "WhatsApp com DDD",
  email: "E-mail",
  canalPreferencial: "Como prefere ser contatado?",
  contatoEmergenciaNome: "Nome do contato de emergência",
  contatoEmergenciaParentesco: "Grau de parentesco",
  contatoEmergenciaTelefone: "Telefone do contato de emergência",
  queixa: "O que motivou sua busca por atendimento?",
  percepcaoUrgencia: "Como você percebe a urgência do atendimento?",
  historicoRelevante: "Histórico relevante",
};
type Campo = keyof typeof rotulos;
type Valores = Record<Campo, string>;
const vazio = Object.fromEntries(
  Object.keys(rotulos).map((campo) => [campo, ""]),
) as Valores;
// Contatos e dados da ficha de identificação da Clínica Escola (DF43).
const opcionais: Campo[] = [
  "celular",
  "email",
  "sexo",
  "profissao",
  "escolaridade",
  "bairro",
  "cidadeUf",
  "cep",
  "cpfResponsavel",
  "documentoResponsavel",
  "whatsapp",
  "contatoEmergenciaNome",
  "contatoEmergenciaParentesco",
  "contatoEmergenciaTelefone",
];
const responsavel: string[] = [
  "responsavelLegal",
  "cpfResponsavel",
  "documentoResponsavel",
];
const tamanhos: Partial<Record<Campo, number>> = {
  endereco: 500,
  cpf: 11,
  cpfResponsavel: 11,
  rg: 30,
  celular: 22,
  whatsapp: 22,
  contatoEmergenciaTelefone: 22,
  email: 254,
  cep: 9,
  sexo: 50,
  contatoEmergenciaParentesco: 50,
  profissao: 100,
  escolaridade: 100,
  bairro: 100,
  cidadeUf: 100,
};
const preenchimento: Partial<Record<Campo, string>> = {
  nomeCompleto: "name",
  celular: "tel-national",
  whatsapp: "tel-national",
  dataNascimento: "bday",
  email: "email",
  cep: "postal-code",
  endereco: "street-address",
  bairro: "address-level3",
  cidadeUf: "address-level2",
};
const etapas = ["Dados e contatos", "Triagem", "Revisão e envio"];

function CampoFormulario({
  campo,
  valor,
  erro,
  alterar,
  tipo = "text",
  dica,
  longo = false,
}: {
  campo: Campo;
  valor: string;
  erro?: string;
  alterar: (campo: Campo, valor: string) => void;
  tipo?: string;
  dica?: string;
  longo?: boolean;
}) {
  const props = {
    id: campo,
    name: campo,
    value: valor,
    required: !opcionais.includes(campo),
    "aria-invalid": !!erro,
    "aria-describedby":
      [dica ? `${campo}-dica` : "", erro ? `${campo}-erro` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => alterar(campo, event.target.value),
  };
  return (
    <div className={`${styles.campo} ${longo ? styles.largo : ""}`}>
      <label htmlFor={campo}>
        {rotulos[campo]} {props.required && <span aria-hidden="true">*</span>}
      </label>
      {campo === "estadoCivil" ? (
        <select {...props}>
          <option value="">Selecione</option>
          {ESTADOS_CIVIS.map((estado) => (
            <option key={estado}>{estado}</option>
          ))}
        </select>
      ) : campo === "canalPreferencial" ? (
        <select {...props}>
          <option value="">Selecione</option>
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="ligacao">Ligação telefônica</option>
        </select>
      ) : ["queixa", "percepcaoUrgencia", "historicoRelevante"].includes(
          campo,
        ) ? (
        <textarea
          {...props}
          rows={5}
          maxLength={campo === "percepcaoUrgencia" ? 2000 : 5000}
        />
      ) : (
        <input
          {...props}
          type={tipo}
          inputMode={
            ["cpf", "cpfResponsavel", "cep"].includes(campo)
              ? "numeric"
              : undefined
          }
          autoComplete={preenchimento[campo] ?? "off"}
          maxLength={tamanhos[campo] ?? 200}
        />
      )}
      {dica && (
        <p className={styles.dica} id={`${campo}-dica`}>
          {dica}
        </p>
      )}
      {erro && (
        <p className={styles.erroCampo} id={`${campo}-erro`}>
          {erro}
        </p>
      )}
    </div>
  );
}

// Com `aberta` falso (produção antes do termo de consentimento, RF57), a página
// mantém o cabeçalho e os contatos de emergência, mas não mostra o formulário.
export function FormularioInscricao({ aberta = true }: { aberta?: boolean }) {
  const [etapa, setEtapa] = useState(0);
  const [valores, setValores] = useState<Valores>(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState("");
  const [comprovante, setComprovante] = useState<ComprovanteInscricao | null>(
    null,
  );
  const envio = useRef<{ chave: string; conteudo: string } | null>(null);
  const emCurso = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const resumo = useRef<HTMLDivElement>(null);
  const focoPendente = useRef<string | null>(null);
  const menor =
    !!valores.dataNascimento && menorDeIdade(valores.dataNascimento);
  useEffect(() => {
    const alvo = focoPendente.current;
    focoPendente.current = null;
    if (alvo) document.getElementById(alvo)?.focus();
    else titulo.current?.focus();
  }, [etapa, comprovante]);
  useEffect(() => {
    if (Object.keys(erros).length) resumo.current?.focus();
  }, [erros]);

  function alterar(campo: Campo, valor: string) {
    setValores((antes) => ({ ...antes, [campo]: valor }));
    setConfirmado(false);
    setFalha("");
  }
  function mudarEtapa(proxima: number) {
    setErros({});
    setFalha("");
    setEtapa(proxima);
  }

  async function continuar(event: FormEvent) {
    event.preventDefault();
    if (emCurso.current) return;
    setFalha("");
    // Os campos do responsável somem da tela quando a data deixa de ser de
    // menor; o que foi digitado neles não é validado nem enviado.
    const dados = menor
      ? valores
      : {
          ...valores,
          responsavelLegal: "",
          cpfResponsavel: "",
          documentoResponsavel: "",
        };
    const conteudo = JSON.stringify(dados);
    if (!envio.current || envio.current.conteudo !== conteudo)
      envio.current = { chave: crypto.randomUUID(), conteudo };
    const payload = { ...dados, confirmado, chaveEnvio: envio.current.chave };
    const schema =
      etapa === 0
        ? dadosInscricaoSchema
        : etapa === 1
          ? triagemInscricaoSchema
          : inscricaoSchema;
    const validacao = schema.safeParse(payload);
    if (!validacao.success) {
      const mensagens: Record<string, string> = {};
      for (const erro of validacao.error.issues)
        mensagens[String(erro.path[0])] ??= erro.message;
      setErros(mensagens);
      return;
    }
    setErros({});
    if (etapa < 2) {
      mudarEtapa(etapa + 1);
      return;
    }
    emCurso.current = true;
    setEnviando(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("API não configurada");
      const resposta = await fetch(`${base}/inscricoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.timeout(20000),
      });
      if (resposta.status === 400) {
        // Aceitar somente caminhos conhecidos e mensagens do contrato local;
        // nunca mostrar o corpo arbitrário de erro retornado pelo servidor.
        const corpo = await resposta.json();
        const campos = Array.isArray(corpo.message) ? corpo.message : [];
        const mensagens: Record<string, string> = {};
        for (const erro of campos) {
          const nome = erro?.path?.[0];
          if (
            typeof nome === "string" &&
            (nome in rotulos || nome === "confirmado")
          )
            mensagens[nome] = "Confira este campo e tente novamente.";
        }
        setErros(mensagens);
      }
      if (resposta.status !== 201) throw new Error("Registro não confirmado");
      const recebido = comprovanteSchema.parse(await resposta.json());
      setComprovante(recebido);
      setValores(vazio);
      envio.current = null;
    } catch {
      setFalha(
        "Não foi possível confirmar sua inscrição. Seus dados foram mantidos nesta página. Tente enviar novamente; repetir o mesmo envio não cria outra inscrição.",
      );
    } finally {
      emCurso.current = false;
      setEnviando(false);
    }
  }

  const campo = (
    nome: Campo,
    opcoes: { tipo?: string; dica?: string; longo?: boolean } = {},
  ) => (
    <CampoFormulario
      key={nome}
      campo={nome}
      valor={valores[nome]}
      erro={erros[nome]}
      alterar={alterar}
      {...opcoes}
    />
  );

  return (
    <div className={styles.pagina}>
      <a href="#conteudo-inscricao" className={styles.pular}>
        Ir para o conteúdo
      </a>
      <header className={styles.cabecalho}>
        <span className={styles.marca} aria-hidden="true">
          FBr
        </span>
        <div>
          <strong>Clínica Escola de Psicologia</strong>
          <span>Faculdade Brasília</span>
        </div>
      </header>
      <aside className={styles.emergencia} aria-label="Contatos de emergência">
        <span className={styles.icone} aria-hidden="true">
          !
        </span>
        <p>
          Em situação de crise ou risco, ligue para o{" "}
          <a href="tel:188">CVV (188)</a> ou para o{" "}
          <a href="tel:192">SAMU (192)</a>.
        </p>
      </aside>
      <main id="conteudo-inscricao" className={styles.conteudo}>
        {!aberta ? (
          <div>
            <h1>Inscrição para atendimento</h1>
            <p className={styles.lead}>
              As inscrições pela internet ainda não estão abertas. Para pedir
              atendimento, procure a secretaria da Clínica Escola FBr.
            </p>
          </div>
        ) : comprovante ? (
          <>
            <div className={styles.sucesso} aria-hidden="true">
              ✓
            </div>
            <div>
              <h1 ref={titulo} tabIndex={-1}>
                Inscrição recebida
              </h1>
              <p className={styles.lead}>
                Recebemos sua solicitação de atendimento na Clínica Escola FBr.
                Guarde este comprovante.
              </p>
            </div>
            <section
              className={styles.cartao}
              aria-label="Comprovante de inscrição"
            >
              <dl className={styles.comprovante}>
                <div>
                  <dt>Número da inscrição</dt>
                  <dd className={styles.numero}>{comprovante.numero}</dd>
                </div>
                <div>
                  <dt>Data e hora do registro</dt>
                  <dd>
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(comprovante.criadaEm))}
                    <small>Horário de Brasília</small>
                  </dd>
                </div>
              </dl>
            </section>
            <div className={styles.aviso}>
              <strong>A inscrição não garante vaga nem agendamento.</strong>
              <p>
                O atendimento depende da triagem feita pela equipe e da
                disponibilidade de vagas. Este comprovante não confirma o início
                do atendimento psicológico.
              </p>
            </div>
            <p className={styles.naoImprimir}>
              Salve ou imprima o comprovante antes de fechar esta página.
            </p>
            <div className={`${styles.acoes} ${styles.naoImprimir}`}>
              <button
                type="button"
                className={styles.primario}
                onClick={() => window.print()}
              >
                Imprimir ou salvar em PDF
              </button>
              <Link className={styles.secundario} href="/">
                Voltar ao início
              </Link>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1>Inscrição para atendimento</h1>
              <p className={styles.lead}>
                Dê o primeiro passo. Preencha seus dados para solicitar
                atendimento psicológico presencial.
              </p>
            </div>
            <ol className={styles.etapas} aria-label="Etapas da inscrição">
              {etapas.map((nome, indice) => (
                <li
                  key={nome}
                  aria-current={etapa === indice ? "step" : undefined}
                  className={indice <= etapa ? styles.ativa : ""}
                >
                  <span>{indice < etapa ? "✓" : indice + 1}</span>
                  {nome}
                </li>
              ))}
            </ol>
            <form onSubmit={continuar} noValidate>
              <div className={styles.cartao}>
                <div>
                  <p className={styles.dica}>Etapa {etapa + 1} de 3</p>
                  <h2 ref={titulo} tabIndex={-1}>
                    {etapas[etapa]}
                  </h2>
                  <p className={styles.dica}>
                    Os campos com * são obrigatórios.
                  </p>
                </div>
                {!!Object.keys(erros).length && (
                  <div
                    className={styles.erros}
                    role="alert"
                    ref={resumo}
                    tabIndex={-1}
                  >
                    <strong>Confira os campos antes de continuar</strong>
                    <ul>
                      {Object.entries(erros).map(([nome, mensagem]) => (
                        <li key={nome}>
                          <a
                            href={`#${nome}`}
                            onClick={(event) => {
                              event.preventDefault();
                              if (etapa === 2 && nome !== "confirmado") {
                                focoPendente.current = nome;
                                setEtapa(
                                  nome in triagemInscricaoSchema.shape ? 1 : 0,
                                );
                              } else document.getElementById(nome)?.focus();
                            }}
                          >
                            {rotulos[nome as Campo] || "Confirmação"}:{" "}
                            {mensagem}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {etapa === 0 && (
                  <div className={styles.grade}>
                    <h3 className={styles.secao}>Identificação</h3>
                    {campo("nomeCompleto", { longo: true })}
                    {campo("dataNascimento", { tipo: "date" })}
                    {campo("estadoCivil")}
                    {campo("sexo")}
                    {campo("profissao")}
                    {campo("escolaridade", {
                      dica: "Exemplo: ensino médio completo.",
                    })}
                    {campo("cpf", {
                      dica: "Digite os 11 números, sem pontos nem traço.",
                    })}
                    {campo("rg", {
                      dica: "Não é necessário enviar foto ou cópia do documento.",
                    })}
                    <h3 className={styles.secao}>Endereço</h3>
                    {campo("endereco", {
                      longo: true,
                      dica: "Rua, número e complemento.",
                    })}
                    {campo("bairro")}
                    {campo("cidadeUf", { dica: "Exemplo: Brasília/DF." })}
                    {campo("cep", { dica: "Exemplo: 72500-000." })}
                    {menor && (
                      <>
                        <h3 className={styles.secao}>Responsável legal</h3>
                        {campo("responsavelLegal", {
                          longo: true,
                          dica: "Obrigatório para pessoas menores de 18 anos.",
                        })}
                        {campo("cpfResponsavel", {
                          dica: "Digite os 11 números, sem pontos nem traço.",
                        })}
                        {campo("documentoResponsavel", {
                          dica: "Exemplo: certidão de nascimento ou termo de guarda. Não é necessário enviar cópia.",
                        })}
                      </>
                    )}
                    <h3 className={styles.secao}>Contatos</h3>
                    <div className={`${styles.info} ${styles.largo}`}>
                      <strong>Como podemos falar com você?</strong>
                      <p>
                        Informe pelo menos um contato: celular ou e-mail.
                        Escolha e-mail, WhatsApp ou ligação como canal
                        preferencial.
                      </p>
                    </div>
                    {campo("celular", {
                      tipo: "tel",
                      dica: "Exemplo: (61) 99999-9999.",
                    })}
                    {campo("whatsapp", {
                      tipo: "tel",
                      dica: "Só se for diferente do celular. Por enquanto, as mensagens da clínica pelo WhatsApp vão para o celular informado acima.",
                    })}
                    {campo("email", {
                      tipo: "email",
                      dica: "Exemplo: nome@exemplo.com.br.",
                    })}
                    {campo("canalPreferencial")}
                    <h3 className={styles.secao}>Contato de emergência</h3>
                    {campo("contatoEmergenciaNome", { longo: true })}
                    {campo("contatoEmergenciaParentesco")}
                    {campo("contatoEmergenciaTelefone", {
                      tipo: "tel",
                      dica: "Exemplo: (61) 99999-9999.",
                    })}
                  </div>
                )}
                {etapa === 1 && (
                  <div className={styles.grade}>
                    <div className={`${styles.info} ${styles.largo}`}>
                      Estas informações são declarações suas e ajudarão a equipe
                      na triagem. Não substituem uma avaliação profissional.
                    </div>
                    {campo("queixa", {
                      longo: true,
                      dica: "Conte, com suas palavras, o motivo da procura.",
                    })}
                    {campo("percepcaoUrgencia", {
                      longo: true,
                      dica: "Descreva como você está se sentindo e sua necessidade de atendimento.",
                    })}
                    {campo("historicoRelevante", {
                      longo: true,
                      dica: "Conte o que considera importante. Se não houver, escreva “Não tenho histórico a informar”.",
                    })}
                  </div>
                )}
                {etapa === 2 && (
                  <>
                    <p>
                      Confira as informações. Você pode voltar para corrigir
                      qualquer campo antes de enviar.
                    </p>
                    {[0, 1].map((grupo) => (
                      <section
                        key={grupo}
                        className={styles.revisao}
                        aria-label={etapas[grupo]}
                      >
                        <div className={styles.tituloRevisao}>
                          <h3>{etapas[grupo]}</h3>
                          <button
                            type="button"
                            disabled={enviando}
                            onClick={() => mudarEtapa(grupo)}
                          >
                            Editar {grupo === 0 ? "dados" : "triagem"}
                          </button>
                        </div>
                        <dl>
                          {Object.entries(rotulos)
                            .filter(
                              ([nome]) =>
                                (grupo === 1) ===
                                  nome in triagemInscricaoSchema.shape &&
                                (!responsavel.includes(nome) || menor),
                            )
                            .map(([nome, rotulo]) => (
                              <div key={nome}>
                                <dt>{rotulo}</dt>
                                <dd>
                                  {nome === "canalPreferencial"
                                    ? valores[nome] === "email"
                                      ? "E-mail"
                                      : valores[nome] === "whatsapp"
                                        ? "WhatsApp"
                                        : "Ligação telefônica"
                                    : nome === "dataNascimento"
                                      ? valores[nome]
                                          .split("-")
                                          .reverse()
                                          .join("/")
                                      : valores[nome as Campo] ||
                                        "Não informado"}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </section>
                    ))}
                    <div className={styles.aviso}>
                      <strong>
                        A inscrição não garante vaga nem agendamento.
                      </strong>
                      <p>
                        O atendimento depende da triagem e da disponibilidade de
                        vagas.
                      </p>
                    </div>
                    <aside
                      className={styles.reserva}
                      aria-label="Consentimento futuro"
                    >
                      Espaço reservado para o termo e aceite de tratamento de
                      dados, sujeito à aprovação da FBr em uma próxima etapa do
                      projeto (RF57).
                    </aside>
                    <label className={styles.confirmacao}>
                      <input
                        id="confirmado"
                        type="checkbox"
                        checked={confirmado}
                        disabled={enviando}
                        onChange={(e) => setConfirmado(e.target.checked)}
                        aria-invalid={!!erros.confirmado}
                        aria-describedby={
                          erros.confirmado ? "confirmado-erro" : undefined
                        }
                      />
                      <span>
                        Revisei os dados e confirmo o envio da minha
                        solicitação. *
                      </span>
                    </label>
                    {erros.confirmado && (
                      <p id="confirmado-erro" className={styles.erroCampo}>
                        {erros.confirmado}
                      </p>
                    )}
                  </>
                )}
                {falha && (
                  <div className={styles.erros} role="alert">
                    {falha}
                  </div>
                )}
                <div className={styles.acoes}>
                  {etapa > 0 ? (
                    <button
                      type="button"
                      disabled={enviando}
                      className={styles.secundario}
                      onClick={() => mudarEtapa(etapa - 1)}
                    >
                      Voltar
                    </button>
                  ) : (
                    <span className={styles.dica}>
                      Seus dados serão enviados somente na última etapa.
                    </span>
                  )}
                  <button
                    className={styles.primario}
                    type="submit"
                    disabled={enviando}
                  >
                    {enviando
                      ? "Enviando…"
                      : etapa === 2
                        ? "Confirmar e enviar inscrição"
                        : "Continuar"}
                  </button>
                </div>
                <span role="status" aria-live="polite">
                  {enviando ? "Aguarde a confirmação do registro." : ""}
                </span>
              </div>
            </form>
          </>
        )}
      </main>
      <footer className={styles.rodape}>
        Clínica Escola de Psicologia da Faculdade Brasília · Atendimento
        presencial
      </footer>
    </div>
  );
}
