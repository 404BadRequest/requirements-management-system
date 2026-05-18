import type { Role } from "@/types/domain";
import { roleHasPermission, type Permission } from "@/lib/auth/permissions";
import { MAIN_NAV_LINK_DEFS, type MainNavClientLink } from "@/components/layout/nav-links";

export type CommandNavItem = { label: string; href: string; requiredPermission: Permission };

export const COMMAND_NAV_ITEMS: CommandNavItem[] = [
  { label: "Ir a Dashboard", href: "/dashboard", requiredPermission: "dashboard.read" },
  { label: "Ir a Requerimientos", href: "/requirements", requiredPermission: "requirements.read" },
  { label: "Ir a Kanban", href: "/requirements/kanban", requiredPermission: "requirements.read" },
  { label: "Ir a Horas", href: "/time-entries", requiredPermission: "time_entries.read" },
  { label: "Ir a Reportes", href: "/reports", requiredPermission: "reports.read" },
  { label: "Ir a Presupuesto", href: "/budgets", requiredPermission: "budgets.read" },
  { label: "Ir a Equipo", href: "/team", requiredPermission: "team.read" },
  { label: "Ir a Avisos", href: "/notifications", requiredPermission: "notifications.read" },
  { label: "Ir a Configuración", href: "/settings/profiles", requiredPermission: "settings.read" },
];

export function filterMainNavForRole(role: Role | undefined): MainNavClientLink[] {
  if (!role) return [];
  return MAIN_NAV_LINK_DEFS.filter((link) => roleHasPermission(role, link.requiredPermission)).map(
    ({ href, label, iconKey }) => ({ href, label, iconKey }),
  );
}

export function filterCommandNavForRole(role: Role | undefined): CommandNavItem[] {
  if (!role) return [];
  return COMMAND_NAV_ITEMS.filter((item) => roleHasPermission(role, item.requiredPermission));
}
