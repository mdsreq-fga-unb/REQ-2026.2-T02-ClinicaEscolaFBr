"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FaixaAlertas } from "@/components/assiduidade/desligamento";
import { api, ErroApi } from "@/lib/api";
import { NOMES_PERFIL, useSessao, type UsuarioDaSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { MENU_POR_PERFIL, tituloDaPagina } from "./menu";

function Marca() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-white text-sm font-extrabold text-primary">
        FBr
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold">Clínica Escola</span>
        <span className="block text-[13px] text-[#cfe3ec]">
          de Psicologia · FBr
        </span>
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

// Inscrições aguardando triagem, no item "Triagem" do menu, como no protótipo.
// A rota devolve só o total, sem as respostas das inscrições.
function useTriagemPendente(usuario: UsuarioDaSessao | undefined) {
  const clinico =
    usuario?.perfil === "supervisor" || usuario?.perfil === "coordenacao";
  const consulta = useQuery({
    queryKey: ["triagem", "total"],
    queryFn: () => api<{ total: number }>("/triagem/inscricoes/total"),
    enabled: clinico,
  });
  return clinico ? consulta.data?.total : undefined;
}

// Menu da área interna: itens do perfil, pessoa da sessão e saída (RF51).
function Navegacao({
  usuario,
  caminho,
  pendentes,
  aoNavegar,
  sair,
  saindo,
  falhaNaSaida,
}: {
  usuario: UsuarioDaSessao;
  caminho: string;
  pendentes?: number;
  aoNavegar?: () => void;
  sair: () => void;
  saindo: boolean;
  falhaNaSaida: boolean;
}) {
  return (
    <>
      <nav aria-label="Menu principal">
        <ul className="flex flex-col gap-1">
          {MENU_POR_PERFIL[usuario.perfil].map(({ rotulo, href, Icone }) => {
            const atual = caminho === href || caminho.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={aoNavegar}
                  aria-current={atual ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] focus-visible:outline-white focus-visible:-outline-offset-[3px]",
                    atual
                      ? "bg-sidebar-primary font-bold text-white"
                      : "font-medium text-[#d6e6ee] hover:bg-sidebar-accent",
                  )}
                >
                  <Icone aria-hidden className="size-5 shrink-0" />
                  {rotulo}
                  {href === "/triagem" && !!pendentes && (
                    <span className="ml-auto rounded-full bg-[#e4f2f8] px-2 py-px text-xs font-bold text-marca">
                      {pendentes}
                      <span className="sr-only"> inscrições</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e4f2f8] text-sm font-bold text-marca"
          >
            {iniciais(usuario.nome)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-semibold break-words text-white">
              {usuario.nome}
            </span>
            <span className="block text-[13px] text-[#cfe3ec]">
              Perfil: {NOMES_PERFIL[usuario.perfil]}
            </span>
          </span>
        </div>
        {falhaNaSaida && (
          <p
            role="alert"
            className="rounded-lg bg-erro-fundo p-2 text-[13px] text-foreground"
          >
            Não foi possível sair: a sessão continua aberta. Verifique a conexão
            e tente de novo.
          </p>
        )}
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#6f8fa0] text-[15px] font-semibold text-white hover:bg-sidebar-accent focus-visible:outline-white disabled:opacity-60"
        >
          <LogOut aria-hidden className="size-5" />
          {saindo ? "Saindo…" : falhaNaSaida ? "Tentar sair de novo" : "Sair"}
        </button>
      </div>
    </>
  );
}

// Área interna da equipe: menu lateral fixo por perfil no computador e menu em
// gaveta no celular, como no protótipo aprovado.
export function AreaInterna({ children }: { children: ReactNode }) {
  const { data: usuario, error, isPending } = useSessao();
  const caminho = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const gaveta = useRef<HTMLDialogElement>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [falhaNaSaida, setFalhaNaSaida] = useState(false);
  const pendentes = useTriagemPendente(usuario);

  useEffect(() => {
    if (error instanceof ErroApi && error.status === 401)
      router.replace("/entrar");
  }, [error, router]);

  useEffect(() => {
    const dialogo = gaveta.current;
    if (!dialogo) return;
    if (menuAberto && !dialogo.open) dialogo.showModal();
    if (!menuAberto && dialogo.open) dialogo.close();
  }, [menuAberto]);

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

  const propsNavegacao = {
    usuario,
    caminho,
    pendentes,
    sair,
    saindo,
    falhaNaSaida,
  };

  return (
    <div className="min-h-[calc(100dvh-var(--altura-faixa,0px))] md:flex">
      <header className="flex min-h-14 items-center gap-1 bg-marca px-1.5 text-white md:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          aria-haspopup="dialog"
          onClick={() => setMenuAberto(true)}
          className="grid size-11 place-items-center rounded-lg focus-visible:outline-white"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <span className="flex-1 text-base font-bold">
          {tituloDaPagina(usuario.perfil, caminho)}
        </span>
        <button
          type="button"
          aria-label={`${usuario.nome}, ${NOMES_PERFIL[usuario.perfil]}: abrir menu`}
          aria-haspopup="dialog"
          onClick={() => setMenuAberto(true)}
          className="grid size-11 place-items-center rounded-full bg-[#e4f2f8] text-sm font-bold text-marca focus-visible:outline-white"
        >
          {iniciais(usuario.nome)}
        </button>
      </header>
      <dialog
        ref={gaveta}
        aria-label="Menu principal"
        onClose={() => setMenuAberto(false)}
        onClick={(evento) => {
          // Tocar fora da gaveta, no fundo escurecido, fecha o menu. O conteúdo
          // ocupa a gaveta toda, então um toque dentro dela nunca tem o próprio
          // <dialog> como alvo.
          if (evento.target === gaveta.current) setMenuAberto(false);
        }}
        className="m-0 h-dvh max-h-none w-[300px] max-w-[85vw] bg-sidebar p-0 text-white backdrop:bg-[rgba(0,26,38,0.55)] open:flex md:hidden"
      >
        {menuAberto && (
          <div className="flex h-full w-full flex-col gap-6 overflow-y-auto px-3.5 pt-3 pb-5">
            <div className="flex items-center justify-between">
              <Marca />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMenuAberto(false)}
                className="grid size-11 place-items-center rounded-lg focus-visible:outline-white"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <Navegacao
              {...propsNavegacao}
              aoNavegar={() => setMenuAberto(false)}
            />
          </div>
        )}
      </dialog>
      <aside
        aria-label="Menu lateral"
        className="hidden w-[264px] shrink-0 flex-col gap-7 overflow-y-auto bg-sidebar px-3.5 py-5 text-sidebar-foreground md:sticky md:top-[var(--altura-faixa,0px)] md:flex md:h-[calc(100dvh-var(--altura-faixa,0px))]"
      >
        <div className="px-1.5">
          <Marca />
        </div>
        <Navegacao {...propsNavegacao} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Alerta do limite de faltas (RF36), fixo no topo do conteúdo. */}
        <FaixaAlertas perfil={usuario.perfil} />
        <main
          id="conteudo"
          className="min-w-0 flex-1 px-4 pt-5 pb-8 md:px-10 md:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
