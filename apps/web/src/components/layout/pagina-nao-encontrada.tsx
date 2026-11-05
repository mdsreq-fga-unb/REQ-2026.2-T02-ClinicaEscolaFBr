"use client";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useSessao } from "@/lib/sessao";
import { AreaInterna } from "./area-interna";
import { PaginaEquipe } from "./pagina-equipe";

// Página de endereço inexistente, em português e com a moldura do sistema: quem
// tem sessão continua na área interna, com o menu do perfil; quem não tem vê a
// moldura pública, com os caminhos para a inscrição e para a entrada.
export function PaginaNaoEncontrada() {
  const { data: usuario, isPending } = useSessao();

  if (isPending) {
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Carregando…
      </p>
    );
  }

  if (usuario) {
    return (
      <AreaInterna>
        <h1 className="ui-titulo">Página não encontrada</h1>
        <p className="ui-subtitulo">
          Esta página não existe ou ainda não está disponível. Use o menu para
          ir a outra página.
        </p>
      </AreaInterna>
    );
  }

  return (
    <PaginaEquipe centralizada>
      <h1 className="text-[26px] leading-[1.25] font-bold text-marca">
        Página não encontrada
      </h1>
      <p className="text-base">
        O endereço pode estar errado ou a página pode ter mudado de lugar.
      </p>
      <div className="flex flex-col gap-3">
        <Link href="/inscricao" className={buttonVariants({ size: "lg" })}>
          Fazer a inscrição
        </Link>
        <Link
          href="/entrar"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Entrar no sistema
        </Link>
      </div>
    </PaginaEquipe>
  );
}
