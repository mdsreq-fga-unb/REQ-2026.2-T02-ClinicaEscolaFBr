"use client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ErroApi } from "@/lib/api";
import { NOMES_PERFIL, useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { MENU_POR_PERFIL } from "./menu";

function Marca() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-md bg-white text-sm font-bold text-marca">
        FBr
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Clínica Escola</span>
        <span className="block text-xs text-white/80">de Psicologia · FBr</span>
      </span>
    </div>
  );
}

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Área interna da equipe: menu lateral por perfil e menu recolhível no celular.
export function AreaInterna({ children }: { children: ReactNode }) {
  const { data: usuario, error, isPending } = useSessao();
  const caminho = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [falhaNaSaida, setFalhaNaSaida] = useState(false);

  useEffect(() => {
    if (error instanceof ErroApi && error.status === 401)
      router.replace("/entrar");
  }, [error, router]);

  if (isPending || !usuario) {
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Carregando…
      </p>
    );
  }

  // Saída (RF51): só depois de a API confirmar que revogou a sessão, os dados em
  // cache são apagados e a pessoa volta à entrada; assim o "voltar" do navegador
  // pede uma nova entrada. Sem a confirmação (por exemplo, sem conexão), a saída
  // não é dada como concluída e a pessoa pode tentar de novo.
  const sair = async () => {
    setSaindo(true);
    setFalhaNaSaida(false);
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      setFalhaNaSaida(true);
      setSaindo(false);
      return;
    }
    queryClient.clear();
    router.replace("/entrar");
  };

  const navegacao = (
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 hidden md:block">
        <Marca />
      </div>
      <ul className="space-y-1">
        {MENU_POR_PERFIL[usuario.perfil].map(({ rotulo, href, Icone }) => {
          const atual = caminho === href || caminho.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMenuAberto(false)}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                  atual
                    ? "bg-sidebar-primary font-semibold"
                    : "hover:bg-sidebar-accent",
                )}
              >
                <Icone aria-hidden className="size-4" />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <div className="mb-3 flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-white text-xs font-bold text-marca"
          >
            {iniciais(usuario.nome)}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{usuario.nome}</span>
            <span className="block text-xs text-white/80">
              Perfil: {NOMES_PERFIL[usuario.perfil]}
            </span>
          </span>
        </div>
        {falhaNaSaida && (
          <p
            role="alert"
            className="mb-3 rounded-md bg-erro-fundo p-2 text-xs text-foreground"
          >
            Não foi possível sair: a sessão continua aberta. Verifique a conexão
            e tente de novo.
          </p>
        )}
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-white/60 py-2 text-sm hover:bg-sidebar-accent disabled:opacity-60"
        >
          <LogOut aria-hidden className="size-4" />
          {saindo ? "Saindo…" : falhaNaSaida ? "Tentar sair de novo" : "Sair"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh md:flex">
      <header className="flex items-center justify-between bg-marca px-4 py-3 text-white md:hidden">
        <button
          type="button"
          aria-expanded={menuAberto}
          aria-controls="menu-celular"
          onClick={() => setMenuAberto((v) => !v)}
          className="flex items-center gap-2 rounded-md p-1"
        >
          {menuAberto ? (
            <X aria-hidden className="size-5" />
          ) : (
            <Menu aria-hidden className="size-5" />
          )}
          <span>{menuAberto ? "Fechar menu" : "Abrir menu"}</span>
        </button>
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-white text-xs font-bold text-marca"
        >
          {iniciais(usuario.nome)}
        </span>
      </header>
      <aside
        id="menu-celular"
        className={cn(
          "bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:block md:h-dvh md:w-64 md:shrink-0",
          menuAberto ? "block" : "hidden",
        )}
      >
        {navegacao}
      </aside>
      <main id="conteudo" className="min-w-0 flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
