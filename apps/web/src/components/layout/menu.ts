import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  HandCoins,
  FileText,
  Folder,
  History,
  Inbox,
  ListOrdered,
  SlidersHorizontal,
  Shuffle,
  User,
  Users,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Perfil } from "@clinica/shared";

export type ItemMenu = { rotulo: string; href: string; Icone: LucideIcon };

const agenda = { rotulo: "Agenda", href: "/agenda", Icone: CalendarDays };
const agendar = {
  rotulo: "Agendar sessão",
  href: "/agendar-sessao",
  Icone: CalendarPlus,
};
const triagem = { rotulo: "Triagem", href: "/triagem", Icone: Inbox };
const distribuicao = {
  rotulo: "Distribuição de casos",
  href: "/distribuicao",
  Icone: Shuffle,
};
const pacientes = { rotulo: "Pacientes", href: "/pacientes", Icone: FileText };
// Faltas dos estagiários (RF39), na prancha 7-1: do supervisor e da coordenação.
const faltasEstagiarios = {
  rotulo: "Faltas dos estagiários",
  href: "/faltas-estagiarios",
  Icone: UserX,
};

// Contribuição social (RF42), na prancha 8-1: da secretaria e da coordenação.
const contribuicoes = {
  rotulo: "Contribuição social",
  href: "/contribuicoes",
  Icone: HandCoins,
};

// Navegação interna por perfil, como no protótipo aprovado pela FBr.
export const MENU_POR_PERFIL: Record<Perfil, ItemMenu[]> = {
  secretaria: [agenda, agendar, pacientes, contribuicoes],
  estagiario: [
    { rotulo: "Meus pacientes", href: "/meus-pacientes", Icone: User },
    agenda,
    agendar,
  ],
  // A "Agenda" do supervisor (RF11) foi proposta à FBr na prancha 4-2.
  supervisor: [
    triagem,
    distribuicao,
    agenda,
    { rotulo: "Meus casos", href: "/meus-casos", Icone: Folder },
    faltasEstagiarios,
  ],
  coordenacao: [
    triagem,
    // Lista numerada, como na prancha 6-1 (#268).
    { rotulo: "Fila de espera", href: "/fila", Icone: ListOrdered },
    distribuicao,
    pacientes,
    contribuicoes,
    { rotulo: "Usuários", href: "/usuarios", Icone: Users },
    faltasEstagiarios,
    // Indicadores operacionais (RF48), na prancha 9-1.
    { rotulo: "Indicadores", href: "/indicadores", Icone: BarChart3 },
    {
      rotulo: "Registro de acessos",
      href: "/acessos-prontuario",
      Icone: History,
    },
    // Data-limite para corrigir evoluções (RF29), na prancha 6-1; e valor da contribuição social (RF41), na prancha 8-1.
    { rotulo: "Parâmetros", href: "/parametros", Icone: SlidersHorizontal },
  ],
};

// Página inicial de cada perfil depois da entrada: o primeiro item do menu (RF50).
export const inicioDoPerfil = (perfil: Perfil) =>
  MENU_POR_PERFIL[perfil][0].href;

// Título do cabeçalho no celular: o item do menu da página aberta ou, nas páginas
// que não estão no menu, o nome da página.
export function tituloDaPagina(perfil: Perfil, caminho: string) {
  const item = MENU_POR_PERFIL[perfil].find(
    ({ href }) => caminho === href || caminho.startsWith(`${href}/`),
  );
  if (item) return item.rotulo;
  if (caminho.startsWith("/prontuarios")) return "Prontuário";
  return "Clínica Escola";
}
