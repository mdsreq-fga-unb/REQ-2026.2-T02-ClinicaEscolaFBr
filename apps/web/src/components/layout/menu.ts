import {
  CalendarDays,
  CalendarPlus,
  FileText,
  Folder,
  Inbox,
  Shuffle,
  User,
  Users,
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

// Navegação interna por perfil, como no protótipo aprovado pela FBr.
export const MENU_POR_PERFIL: Record<Perfil, ItemMenu[]> = {
  secretaria: [agenda, agendar, pacientes],
  estagiario: [
    { rotulo: "Meus pacientes", href: "/meus-pacientes", Icone: User },
    agenda,
    agendar,
  ],
  supervisor: [
    triagem,
    distribuicao,
    { rotulo: "Meus casos", href: "/meus-casos", Icone: Folder },
  ],
  coordenacao: [
    triagem,
    distribuicao,
    pacientes,
    { rotulo: "Usuários", href: "/usuarios", Icone: Users },
  ],
};
