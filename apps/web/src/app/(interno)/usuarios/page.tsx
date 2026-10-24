"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleMinus, Clock, Info, Plus } from "lucide-react";
import { useState } from "react";
import {
  cadastroUsuarioSchema,
  PERFIS,
  SITUACOES_USUARIO,
  type CadastroUsuario,
  type Perfil,
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
  const estilo = {
    pendente_ativacao: { Icone: Clock, classe: "bg-alerta-fundo text-alerta" },
    ativo: { Icone: CircleCheck, classe: "bg-sucesso-fundo text-sucesso" },
    desativado: {
      Icone: CircleMinus,
      classe: "bg-muted text-muted-foreground",
    },
  }[usuario.situacao];
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${estilo.classe}`}
      >
        <estilo.Icone aria-hidden className="size-3.5" />
        {NOMES_SITUACAO[usuario.situacao]}
      </span>
      {detalhe && (
        <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
      )}
    </div>
  );
}

function FormularioCadastro({
  aoConcluir,
  aoCancelar,
}: {
  aoConcluir: (email: string) => void;
  aoCancelar: () => void;
}) {
  const [dados, setDados] = useState<Partial<CadastroUsuario>>({});
  const [erros, setErros] = useState<
    Partial<Record<keyof CadastroUsuario, string>>
  >({});
  const cliente = useQueryClient();
  const cadastro = useMutation({
    mutationFn: (valores: CadastroUsuario) =>
      api("/usuarios", { method: "POST", body: JSON.stringify(valores) }),
    onSuccess: (_, valores) => {
      void cliente.invalidateQueries({ queryKey: ["usuarios"] });
      aoConcluir(valores.email);
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
    <form noValidate onSubmit={enviar} className="space-y-4">
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
      >
        <legend className="text-sm font-semibold">Perfil</legend>
        <p id="perfil-dica" className="text-xs text-muted-foreground">
          Escolha um único perfil.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERFIS.map((perfil) => (
            <label
              key={perfil}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-checked:border-primary has-checked:bg-accent"
            >
              <input
                type="radio"
                name="perfil"
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
          <p className="mt-1 text-xs font-medium text-destructive">
            {erros.perfil}
          </p>
        )}
      </fieldset>
      <p className="flex gap-2 rounded-md bg-info-fundo p-3 text-sm">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        Ao salvar, a conta fica &quot;Pendente de ativação&quot; e a pessoa
        recebe um convite por e-mail para criar a própria senha.
      </p>
      {cadastro.isError &&
        !(
          cadastro.error instanceof ErroApi && cadastro.error.status === 409
        ) && (
          <Aviso tipo="erro" titulo="Não foi possível cadastrar.">
            Tente novamente em instantes.
          </Aviso>
        )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={cadastro.isPending}>
          Salvar e enviar convite
        </Button>
      </div>
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
  const [paraDesativar, setParaDesativar] = useState<UsuarioListado | null>(
    null,
  );
  const [mensagem, setMensagem] = useState<{
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
      <div className="flex gap-3 md:justify-end">
        {u.situacao === "pendente_ativacao" && (
          <Button
            variant="link"
            className="px-0"
            onClick={() => reenvio.mutate(u)}
            disabled={reenvio.isPending}
          >
            Reenviar convite<span className="sr-only"> para {u.nome}</span>
          </Button>
        )}
        {u.situacao !== "desativado" && u.id !== sessao?.id && (
          <Button
            variant="link"
            className="px-0 text-destructive"
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre a equipe e envie convites. Cada pessoa tem um único perfil.
          </p>
        </div>
        <Button size="lg" onClick={() => setCadastroAberto(true)}>
          <Plus aria-hidden />
          Cadastrar usuário
        </Button>
      </div>

      {mensagem && (
        <Aviso tipo="sucesso" titulo={mensagem.titulo}>
          {mensagem.texto}
        </Aviso>
      )}
      {reenvio.isError && (
        <Aviso tipo="erro" titulo="Não foi possível reenviar o convite." />
      )}

      <section
        aria-label="Filtros"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[2fr_1fr_1fr]"
      >
        <Campo rotulo="Buscar">
          {(props) => (
            <input
              {...props}
              type="search"
              placeholder="Nome ou e-mail"
              className={classeEntrada}
              value={filtro.busca}
              onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            />
          )}
        </Campo>
        <Campo rotulo="Perfil">
          {(props) => (
            <select
              {...props}
              className={classeEntrada}
              value={filtro.perfil}
              onChange={(e) => setFiltro({ ...filtro, perfil: e.target.value })}
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
        <Campo rotulo="Situação">
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

      {lista.isPending && <p role="status">Carregando usuários…</p>}
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os usuários." />
      )}
      {lista.data && lista.data.length === 0 && (
        <Aviso
          tipo="info"
          titulo="Nenhum usuário encontrado com esses filtros."
        />
      )}
      {lista.data && lista.data.length > 0 && (
        <>
          <table className="hidden w-full overflow-hidden rounded-lg border border-border bg-card text-sm md:table">
            <caption className="sr-only">Usuários cadastrados</caption>
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Nome
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  E-mail
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Perfil
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Situação
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.data.map((u) => (
                <tr key={u.id}>
                  <th scope="row" className="px-4 py-3 text-left font-semibold">
                    {u.nome}
                    {u.id === sessao?.id && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </th>
                  <td className="px-4 py-3 break-all">{u.email}</td>
                  <td className="px-4 py-3">{NOMES_PERFIL[u.perfil]}</td>
                  <td className="px-4 py-3">
                    <Situacao usuario={u} />
                  </td>
                  <td className="px-4 py-3">{acoes(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
            {lista.data.map((u) => (
              <li key={u.id} className="space-y-2 p-4">
                <p className="font-semibold">
                  {u.nome}
                  {u.id === sessao?.id && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      (você)
                    </span>
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

      <Dialogo
        aberto={cadastroAberto}
        aoFechar={() => setCadastroAberto(false)}
        titulo="Cadastrar usuário"
      >
        {cadastroAberto && (
          <FormularioCadastro
            aoCancelar={() => setCadastroAberto(false)}
            aoConcluir={(email) => {
              setCadastroAberto(false);
              setMensagem({
                titulo: `Convite enviado para ${email}.`,
                texto:
                  'A conta fica "Pendente de ativação" até a pessoa criar a própria senha pelo link do convite (válido por 72 horas).',
              });
            }}
          />
        )}
      </Dialogo>

      <Dialogo
        aberto={!!paraDesativar}
        aoFechar={() => setParaDesativar(null)}
        titulo={`Desativar ${paraDesativar?.nome ?? ""}?`}
      >
        <p className="text-sm">
          A pessoa não poderá mais entrar no sistema a partir de agora.
        </p>
        <Aviso tipo="info" titulo="O histórico é mantido." className="mt-4">
          Os registros feitos por ela, como prontuários, sessões e decisões,
          continuam guardados e com a autoria preservada.
        </Aviso>
        {desativacao.isError && (
          <Aviso
            tipo="erro"
            titulo="Não foi possível desativar."
            className="mt-4"
          />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setParaDesativar(null)}>
            Cancelar
          </Button>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={desativacao.isPending}
            onClick={() => paraDesativar && desativacao.mutate(paraDesativar)}
          >
            Desativar usuário
          </Button>
        </div>
      </Dialogo>
    </div>
  );
}
