import { redirect } from "next/navigation";

// A raiz do sistema leva à entrada da equipe (RF50); quem já tem sessão segue
// de lá para a página inicial do seu perfil.
export default function Home() {
  redirect("/entrar");
}
