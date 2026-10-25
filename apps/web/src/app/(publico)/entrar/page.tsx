"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginSchema } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { inicioDoPerfil } from "@/components/layout/menu";
import { PaginaEquipe } from "@/components/layout/pagina-equipe";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { useSessao, type UsuarioDaSessao } from "@/lib/sessao";

const hora = (data: Date) =>
  data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// Entrada da equipe no sistema (RF50): erro genérico e bloqueio de 15 minutos (RNF49).
export default function EntrarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessao = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [bloqueadoAte, setBloqueadoAte] = useState<Date | null>(null);

  // Quem já tem sessão vai direto para a página inicial do seu perfil.
  useEffect(() => {
    if (sessao.data) router.replace(inicioDoPerfil(sessao.data.perfil));
  }, [sessao.data, router]);

  // Libera o botão quando o bloqueio termina.
  useEffect(() => {
    if (!bloqueadoAte) return;
    const espera = bloqueadoAte.getTime() - Date.now();
    const temporizador = setTimeout(
      () => setBloqueadoAte(null),
      Math.max(espera, 0),
    );
    return () => clearTimeout(temporizador);
  }, [bloqueadoAte]);

  const entrada = useMutation({
    mutationFn: () =>
      api<UsuarioDaSessao>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      }),
    onSuccess: (usuario) => {
      queryClient.setQueryData(["sessao"], usuario);
      router.replace(inicioDoPerfil(usuario.perfil));
    },
    onError: (erro) => {
      setSenha("");
      if (
        erro instanceof ErroApi &&
        erro.status === 423 &&
        typeof erro.corpo?.bloqueadoAte === "string"
      ) {
        setBloqueadoAte(new Date(erro.corpo.bloqueadoAte));
      }
    },
  });

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const resultado = loginSchema.safeParse({ email, senha });
    if (!resultado.success) {
      const novos: typeof erros = {};
      for (const p of resultado.error.issues) {
        const campo = p.path[0] as "email" | "senha";
        novos[campo] ??= p.message;
      }
      setErros(novos);
      return;
    }
    setErros({});
    entrada.mutate();
  };

  const status = entrada.error instanceof ErroApi ? entrada.error.status : null;
  const credenciaisIncorretas = status === 401;
  const falhaInesperada = entrada.isError && status !== 401 && status !== 423;

  return (
    <PaginaEquipe>
      <h1 className="text-xl font-semibold text-marca">Entrar no sistema</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acesso da equipe da clínica: secretaria, estagiários, supervisores e
        coordenação.
      </p>

      {credenciaisIncorretas && (
        <Aviso
          tipo="erro"
          titulo="E-mail ou senha incorretos."
          className="mt-4"
        >
          Confira os dados e tente novamente.
        </Aviso>
      )}
      {bloqueadoAte && (
        <Aviso
          tipo="alerta"
          titulo="Acesso bloqueado por 15 minutos."
          className="mt-4"
        >
          Houve 3 tentativas de entrada sem sucesso. Tente novamente a partir
          das {hora(bloqueadoAte)}. Se não lembra a senha, procure a
          coordenação.
        </Aviso>
      )}
      {falhaInesperada && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível entrar agora."
          className="mt-4"
        >
          Tente novamente em instantes.
        </Aviso>
      )}

      <form noValidate onSubmit={enviar} className="mt-5 space-y-4">
        <Campo rotulo="E-mail" erro={erros.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              autoFocus
              className={classeEntrada}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo="Senha" erro={erros.senha}>
          {(props) => (
            <div className="flex gap-2">
              <input
                {...props}
                type={senhaVisivel ? "text" : "password"}
                autoComplete="current-password"
                className={classeEntrada}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-10"
                aria-pressed={senhaVisivel}
                onClick={() => setSenhaVisivel((v) => !v)}
              >
                {senhaVisivel ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                {senhaVisivel ? "Ocultar" : "Mostrar"}
                <span className="sr-only"> senha</span>
              </Button>
            </div>
          )}
        </Campo>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={entrada.isPending || bloqueadoAte !== null}
        >
          {bloqueadoAte
            ? `Entrar (disponível às ${hora(bloqueadoAte)})`
            : entrada.isPending
              ? "Entrando…"
              : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
        Quer atendimento psicológico?{" "}
        <Link
          href="/inscricao"
          className="font-semibold text-primary underline"
        >
          Faça sua inscrição on-line
        </Link>
        .
      </p>
    </PaginaEquipe>
  );
}
