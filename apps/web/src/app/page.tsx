"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { inicioDoPerfil } from "@/components/layout/menu";
import { useSessao } from "@/lib/sessao";

// A raiz do sistema é o endereço divulgado para o público: leva à inscrição
// (RF1). Quem é da equipe e já tem sessão segue para a página inicial do seu
// perfil (RF50); quem não tem entra por /entrar.
export default function Home() {
  const router = useRouter();
  const { data: usuario, isPending } = useSessao();

  useEffect(() => {
    if (isPending) return;
    router.replace(usuario ? inicioDoPerfil(usuario.perfil) : "/inscricao");
  }, [isPending, usuario, router]);

  return (
    <p role="status" className="p-6 text-sm text-muted-foreground">
      Carregando…
    </p>
  );
}
