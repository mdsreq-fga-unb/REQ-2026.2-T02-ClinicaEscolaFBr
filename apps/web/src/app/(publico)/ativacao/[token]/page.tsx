"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Circle, Clock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { REGRAS_SENHA, ativacaoSchema, type Perfil } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { PaginaEquipe } from "@/components/layout/pagina-equipe";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { NOMES_PERFIL } from "@/lib/sessao";

type Convite = { nome: string; email: string; perfil: Perfil };

function CampoSenha({
  rotulo,
  valor,
  aoMudar,
  erro,
  dica,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro?: string;
  dica?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo rotulo={rotulo} erro={erro} dica={dica}>
      {(props) => (
        <div className="flex gap-2">
          <input
            {...props}
            type={visivel ? "text" : "password"}
            autoComplete="new-password"
            className={classeEntrada}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-10"
            aria-pressed={visivel}
            onClick={() => setVisivel((v) => !v)}
          >
            {visivel ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {visivel ? "Ocultar" : "Mostrar"}
            <span className="sr-only"> {rotulo.toLowerCase()}</span>
          </Button>
        </div>
      )}
    </Campo>
  );
}

function LinkInvalido() {
  return (
    <div className="space-y-4">
      <Clock
        aria-hidden
        className="size-10 rounded-full bg-alerta-fundo p-2 text-alerta"
      />
      <h1 className="text-xl font-semibold text-marca">
        Este link de ativação não é mais válido
      </h1>
      <p className="text-sm">
        O link vence 72 horas depois do envio do convite e só pode ser usado uma
        vez.
      </p>
      <div className="rounded-md bg-info-fundo p-4 text-sm">
        <p className="font-semibold">O que fazer</p>
        <p>
          Peça um novo convite à coordenação da clínica. Se você já ativou sua
          conta, entre com seu e-mail e senha.
        </p>
      </div>
      <Link
        href="/entrar"
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        Ir para a página de entrada
      </Link>
    </div>
  );
}

// Ativação da conta pelo link do convite (RF53).
export default function AtivacaoPage() {
  const { token } = useParams<{ token: string }>();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>(
    {},
  );

  const convite = useQuery({
    queryKey: ["convite", token],
    queryFn: () => api<Convite>(`/ativacao/${token}`),
    retry: false,
  });
  const ativacao = useMutation({
    mutationFn: () =>
      api("/ativacao", {
        method: "POST",
        body: JSON.stringify({ token, senha, confirmacao }),
      }),
  });

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const resultado = ativacaoSchema.safeParse({ token, senha, confirmacao });
    if (!resultado.success) {
      const novos: typeof erros = {};
      for (const p of resultado.error.issues) {
        const campo = p.path[0] as "senha" | "confirmacao";
        novos[campo] ??= p.message;
      }
      setErros(novos);
      return;
    }
    setErros({});
    ativacao.mutate();
  };

  if (convite.isPending) {
    return (
      <PaginaEquipe>
        <p role="status">Carregando…</p>
      </PaginaEquipe>
    );
  }
  const invalido =
    (convite.error instanceof ErroApi && convite.error.status === 410) ||
    (ativacao.error instanceof ErroApi && ativacao.error.status === 410);
  if (invalido) {
    return (
      <PaginaEquipe>
        <LinkInvalido />
      </PaginaEquipe>
    );
  }
  if (convite.isError || !convite.data) {
    return (
      <PaginaEquipe>
        <Aviso tipo="erro" titulo="Não foi possível abrir o convite.">
          Tente novamente em instantes.
        </Aviso>
      </PaginaEquipe>
    );
  }
  if (ativacao.isSuccess) {
    return (
      <PaginaEquipe>
        <div className="space-y-4">
          <Aviso tipo="sucesso" titulo="Conta ativada.">
            Agora você já pode entrar no sistema com seu e-mail e senha.
          </Aviso>
          <Link
            href="/entrar"
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Ir para a página de entrada
          </Link>
        </div>
      </PaginaEquipe>
    );
  }

  const { nome, email, perfil } = convite.data;
  return (
    <PaginaEquipe>
      <h1 className="text-xl font-semibold text-marca">Ative sua conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você recebeu um convite da coordenação. Crie sua senha para entrar no
        sistema.
      </p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-muted p-3 text-sm">
        <dt className="text-muted-foreground">Nome</dt>
        <dd className="font-semibold">{nome}</dd>
        <dt className="text-muted-foreground">E-mail</dt>
        <dd className="font-semibold break-all">{email}</dd>
        <dt className="text-muted-foreground">Perfil</dt>
        <dd className="font-semibold">{NOMES_PERFIL[perfil]}</dd>
      </dl>
      <form noValidate onSubmit={enviar} className="mt-5 space-y-4">
        <CampoSenha
          rotulo="Nova senha"
          valor={senha}
          aoMudar={setSenha}
          erro={erros.senha}
        />
        <ul
          aria-label="Regras da senha"
          className="space-y-1 rounded-md bg-muted p-3 text-xs"
        >
          {REGRAS_SENHA.map((regra) => {
            const ok = regra.teste(senha);
            return (
              <li
                key={regra.id}
                className={
                  ok
                    ? "flex items-center gap-1.5 text-sucesso"
                    : "flex items-center gap-1.5 text-muted-foreground"
                }
              >
                {ok ? (
                  <Check aria-hidden className="size-3.5" />
                ) : (
                  <Circle aria-hidden className="size-3.5" />
                )}
                {regra.texto}
                <span className="sr-only">
                  {ok ? " (cumprida)" : " (falta)"}
                </span>
                {!ok && <span aria-hidden> (falta)</span>}
              </li>
            );
          })}
        </ul>
        <CampoSenha
          rotulo="Confirmar nova senha"
          valor={confirmacao}
          aoMudar={setConfirmacao}
          erro={erros.confirmacao}
        />
        {ativacao.isError && !invalido && (
          <Aviso tipo="erro" titulo="Não foi possível ativar a conta.">
            Confira a senha e tente novamente.
          </Aviso>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={ativacao.isPending}
        >
          Ativar conta
        </Button>
        <p className="text-xs text-muted-foreground">
          Este link vale por 72 horas a partir do envio do convite e só pode ser
          usado uma vez.
        </p>
      </form>
    </PaginaEquipe>
  );
}
