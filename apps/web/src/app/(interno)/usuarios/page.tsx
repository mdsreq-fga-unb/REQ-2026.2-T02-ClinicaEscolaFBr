"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import {
  cadastroUsuarioSchema,
  PERFIS,
  SITUACOES_USUARIO,
  type CadastroUsuario,
  type Perfil,
  type ResultadoCadastroUsuario,
  type SituacaoUsuario,
  type UsuarioListado,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { NOMES_PERFIL, useSessao } from "@/lib/sessao";

const NOMES_SITUACAO: Record<SituacaoUsuario, string> = {
  pendente_ativacao: "Pendente de ativação",
  ativo: "Ativo",
  desativado: "Desativado",
};

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// Situação sempre com ícone e texto, não só cor (RNF56).
function Situacao({ usuario }: { usuario: UsuarioListado }) {
  const vencido = usuario.conviteVencido;
  const detalhe =
    usuario.situacao === "pendente_ativacao" && usuario.conviteEnviadoEm
      ? vencido
        ? `Convite vencido em ${data(usuario.conviteExpiraEm!)}`
        : `Convite enviado em ${data(usuario.conviteEnviadoEm)}, ${hora(usuario.conviteEnviadoEm)}`
      : usuario.situacao === "desativado" && usuario.desativadoEm
        ? `Em ${data(usuario.desativadoEm)} · histórico mantido`
        : null;
  const classe = {
    pendente_ativacao: "border-[#efc28a] bg-[#fff1e0] text-[#8a4500]",
    ativo: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
    desativado: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
  }[usuario.situacao];
  return (
    <div>
      <span className={`ui-selo ${classe}`}>
        {NOMES_SITUACAO[usuario.situacao]}
      </span>
      {detalhe && <p className="ui-meta mt-1">{detalhe}</p>}
    </div>
  );
}

const FORMULARIO_CADASTRO = "cadastro-usuario";

function FormularioCadastro({
  aoConcluir,
  aoEnviar,
}: {
  aoConcluir: (email: string, conviteEnviado: boolean) => void;
  aoEnviar: (enviando: boolean) => void;
}) {
  const [dados, setDados] = useState<Partial<CadastroUsuario>>({});
  const [erros, setErros] = useState<
    Partial<Record<keyof CadastroUsuario, string>>
  >({});
  const cliente = useQueryClient();
  const cadastro = useMutation({
    mutationFn: (valores: CadastroUsuario) =>
      api<ResultadoCadastroUsuario>("/usuarios", {
        method: "POST",
        body: JSON.stringify(valores),
      }),
    onMutate: () => aoEnviar(true),
    onSettled: () => aoEnviar(false),
    onSuccess: (resultado, valores) => {
      void cliente.invalidateQueries({ queryKey: ["usuarios"] });
      aoConcluir(valores.email, resultado.conviteEnviado);
    },
    onError: (erro) => {
      if (erro instanceof ErroApi && erro.status === 409) {
        setErros({
          email:
            "Este e-mail já está cadastrado para outro usuário. Informe outro e-mail ou procure a pessoa na lista.",
        });
      }
    },
  });

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const resultado = cadastroUsuarioSchema.safeParse(dados);
    if (!resultado.success) {
      const novos: typeof erros = {};
      for (const problema of resultado.error.issues) {
        const campo = problema.path[0] as keyof CadastroUsuario;
        novos[campo] ??=
          campo === "perfil" ? "Escolha um perfil." : problema.message;
      }
      setErros(novos);
      return;
    }
    setErros({});
    cadastro.mutate(resultado.data);
  };

  return (
    <form
      id={FORMULARIO_CADASTRO}
      noValidate
      onSubmit={enviar}
      className="flex flex-col gap-[18px]"
    >
      <Campo rotulo="Nome completo" erro={erros.nome}>
        {(props) => (
          <input
            {...props}
            className={classeEntrada}
            autoComplete="off"
            value={dados.nome ?? ""}
            onChange={(e) => setDados({ ...dados, nome: e.target.value })}
          />
        )}
      </Campo>
      <Campo rotulo="E-mail" erro={erros.email}>
        {(props) => (
          <input
            {...props}
            type="email"
            className={classeEntrada}
            autoComplete="off"
            value={dados.email ?? ""}
            onChange={(e) => setDados({ ...dados, email: e.target.value })}
          />
        )}
      </Campo>
      <fieldset
        aria-describedby="perfil-dica"
        aria-invalid={erros.perfil ? true : undefined}
        className="flex min-w-0 flex-col gap-2"
      >
        <legend className="ui-rotulo mb-1.5">Perfil</legend>
        <p id="perfil-dica" className="ui-dica -mt-1">
          Escolha um único perfil.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERFIS.map((perfil) => (
            <label
              key={perfil}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-input bg-white px-3 py-2 text-[15px] has-checked:border-primary has-checked:bg-accent has-checked:font-semibold"
            >
              <input
                type="radio"
                name="perfil"
                className="size-[18px] accent-primary"
                value={perfil}
                checked={dados.perfil === perfil}
                onChange={() =>
                  setDados({ ...dados, perfil: perfil as Perfil })
                }
              />
              {NOMES_PERFIL[perfil]}
            </label>
          ))}
        </div>
        {erros.perfil && (
          <p className="text-sm font-semibold text-destructive">
            {erros.perfil}
          </p>
        )}
      </fieldset>
      <p className="rounded-[12px] border border-[#a9cfe0] bg-info-fundo px-4 py-3.5 text-[15px]">
        Ao salvar, a conta fica “Pendente de ativação” e a pessoa recebe um
        convite por e-mail para criar a própria senha.
      </p>
      {cadastro.isError &&
        !(
          cadastro.error instanceof ErroApi && cadastro.error.status === 409
        ) && (
          <Aviso tipo="erro" titulo="Não foi possível cadastrar.">
            Tente novamente em instantes.
          </Aviso>
        )}
    </form>
  );
}

// Usuários da equipe: cadastro, convite, reenvio e desativação (RF53 e RF54).
export default function UsuariosPage() {
  const { data: sessao } = useSessao();
  const cliente = useQueryClient();
  const [filtro, setFiltro] = useState<{
    busca: string;
    perfil: string;
    situacao: string;
  }>({
    busca: "",
    perfil: "",
    situacao: "",
  });
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [paraDesativar, setParaDesativar] = useState<UsuarioListado | null>(
    null,
  );
  const [mensagem, setMensagem] = useState<{
    tipo?: "sucesso" | "alerta";
    titulo: string;
    texto: string;
  } | null>(null);

  const parametros = new URLSearchParams(
    Object.entries(filtro).filter(([, v]) => v) as [string, string][],
  ).toString();
  const lista = useQuery({
    queryKey: ["usuarios", parametros],
    queryFn: () =>
      api<UsuarioListado[]>(`/usuarios${parametros ? `?${parametros}` : ""}`),
  });

  const reenvio = useMutation({
    mutationFn: (u: UsuarioListado) =>
      api(`/usuarios/${u.id}/convite`, { method: "POST" }),
    onSuccess: (_, u) => {
      void cliente.invalidateQueries({ queryKey: ["usuarios"] });
      setMensagem({
        titulo: `Novo convite enviado para ${u.email}.`,
        texto: "O link anterior deixou de valer. O novo vale por 72 horas.",
      });
    },
  });
  const desativacao = useMutation({
    mutationFn: (u: UsuarioListado) =>
      api(`/usuarios/${u.id}/desativacao`, { method: "POST" }),
    onSuccess: (_, u) => {
      void cliente.invalidateQueries({ queryKey: ["usuarios"] });
      setParaDesativar(null);
      setMensagem({
        titulo: `${u.nome} foi desativado.`,
        texto:
          "A pessoa não entra mais no sistema, e os registros feitos por ela continuam guardados.",
      });
    },
  });

  // Ações de cada linha, chamadas como função para não recriar um componente a cada render.
  const acoes = (u: UsuarioListado) => {
    return (
      <div className="flex flex-wrap gap-1 md:justify-end">
        {u.situacao === "pendente_ativacao" && (
          <Button
            variant="ghost"
            onClick={() => reenvio.mutate(u)}
            disabled={reenvio.isPending}
          >
            Reenviar convite<span className="sr-only"> para {u.nome}</span>
          </Button>
        )}
        {u.situacao !== "desativado" && u.id !== sessao?.id && (
          <Button
            variant="destructive-ghost"
            onClick={() => setParaDesativar(u)}
          >
            Desativar<span className="sr-only"> {u.nome}</span>
          </Button>
        )}
      </div>
    );
  };

  if (sessao && sessao.perfil !== "coordenacao") {
    return <Aviso tipo="erro" titulo="Acesso restrito à coordenação." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-titulo">Usuários</h1>
          <p className="ui-subtitulo">
            Cadastre a equipe e envie convites. Cada pessoa tem um único perfil.
          </p>
        </div>
        <Button onClick={() => setCadastroAberto(true)}>
          Cadastrar usuário
        </Button>
      </div>

      {mensagem && (
        <Aviso tipo={mensagem.tipo ?? "sucesso"} titulo={mensagem.titulo}>
          {mensagem.texto}
        </Aviso>
      )}
      {reenvio.isError && (
        <Aviso tipo="erro" titulo="Não foi possível reenviar o convite.">
          {reenvio.error instanceof ErroApi && reenvio.error.status === 503
            ? reenvio.error.message
            : null}
        </Aviso>
      )}

      <div className="ui-painel">
        <section
          aria-label="Filtros"
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <Campo
            rotulo="Buscar"
            className="min-w-[260px] flex-1 max-md:min-w-full"
          >
            {(props) => (
              <input
                {...props}
                type="search"
                placeholder="Nome ou e-mail"
                className={classeEntrada}
                value={filtro.busca}
                onChange={(e) =>
                  setFiltro({ ...filtro, busca: e.target.value })
                }
              />
            )}
          </Campo>
          <Campo rotulo="Perfil" className="w-[200px] max-md:flex-1">
            {(props) => (
              <select
                {...props}
                className={classeEntrada}
                value={filtro.perfil}
                onChange={(e) =>
                  setFiltro({ ...filtro, perfil: e.target.value })
                }
              >
                <option value="">Todos</option>
                {PERFIS.map((p) => (
                  <option key={p} value={p}>
                    {NOMES_PERFIL[p]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Situação" className="w-[220px] max-md:flex-1">
            {(props) => (
              <select
                {...props}
                className={classeEntrada}
                value={filtro.situacao}
                onChange={(e) =>
                  setFiltro({ ...filtro, situacao: e.target.value })
                }
              >
                <option value="">Todas</option>
                {SITUACOES_USUARIO.map((s) => (
                  <option key={s} value={s}>
                    {NOMES_SITUACAO[s]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </section>

        {lista.isPending && (
          <p role="status" className="p-5">
            Carregando usuários…
          </p>
        )}
        {lista.isError && (
          <div className="p-4">
            <Aviso
              tipo="erro"
              titulo="Não foi possível carregar os usuários."
            />
          </div>
        )}
        {lista.data && lista.data.length === 0 && (
          <p role="status" className="ui-dica p-5">
            Nenhum usuário encontrado com esses filtros.
          </p>
        )}
        {lista.data && lista.data.length > 0 && (
          <>
            <table className="ui-tabela max-md:hidden">
              <caption className="sr-only">Usuários cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((u) => (
                  <tr key={u.id}>
                    <th
                      scope="row"
                      className="border-b border-border bg-white! px-5 py-3 text-left text-[15px]! font-semibold! text-foreground!"
                    >
                      {u.nome}
                      {u.id === sessao?.id && (
                        <span className="ui-meta font-normal"> (você)</span>
                      )}
                    </th>
                    <td className="break-all">{u.email}</td>
                    <td>{NOMES_PERFIL[u.perfil]}</td>
                    <td>
                      <Situacao usuario={u} />
                    </td>
                    <td>{acoes(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-border md:hidden">
              {lista.data.map((u) => (
                <li key={u.id} className="flex flex-col gap-2 p-4">
                  <p className="font-semibold">
                    {u.nome}
                    {u.id === sessao?.id && (
                      <span className="ui-meta font-normal"> (você)</span>
                    )}
                  </p>
                  <p className="text-sm break-all">{u.email}</p>
                  <p className="text-sm">{NOMES_PERFIL[u.perfil]}</p>
                  <Situacao usuario={u} />
                  {acoes(u)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Dialogo
        aberto={cadastroAberto}
        aoFechar={() => setCadastroAberto(false)}
        titulo="Cadastrar usuário"
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCadastroAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORMULARIO_CADASTRO}
              data-principal
              disabled={cadastrando}
            >
              Salvar e enviar convite
            </Button>
          </>
        }
      >
        {cadastroAberto && (
          <FormularioCadastro
            aoEnviar={setCadastrando}
            aoConcluir={(email, conviteEnviado) => {
              setCadastroAberto(false);
              setMensagem(
                conviteEnviado
                  ? {
                      titulo: `Convite enviado para ${email}.`,
                      texto:
                        'A conta fica "Pendente de ativação" até a pessoa criar a própria senha pelo link do convite (válido por 72 horas).',
                    }
                  : {
                      tipo: "alerta",
                      titulo: `Usuário cadastrado, mas o convite não foi enviado para ${email}.`,
                      texto:
                        'O e-mail não pôde ser enviado agora. Use "Reenviar convite" na linha da pessoa para tentar de novo.',
                    },
              );
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        alerta
        aberto={!!paraDesativar}
        aoFechar={() => setParaDesativar(null)}
        titulo={`Desativar ${paraDesativar?.nome ?? ""}?`}
        rodape={
          <>
            <Button variant="outline" onClick={() => setParaDesativar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              data-principal
              disabled={desativacao.isPending}
              onClick={() => paraDesativar && desativacao.mutate(paraDesativar)}
            >
              Desativar usuário
            </Button>
          </>
        }
      >
        <p>A pessoa não poderá mais entrar no sistema a partir de agora.</p>
        <Aviso tipo="info" titulo="O histórico é mantido.">
          Os registros feitos por ela, como prontuários, sessões e decisões,
          continuam guardados e com a autoria preservada.
        </Aviso>
        {desativacao.isError && (
          <Aviso tipo="erro" titulo="Não foi possível desativar." />
        )}
      </Dialogo>
    </div>
  );
}
