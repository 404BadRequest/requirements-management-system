import type { Permission } from "@/lib/auth/permissions";

/** Claves serializables para resolver el icono en el cliente (evita pasar componentes función RSC → cliente). */
export type MainNavIconKey =
  | "dashboard"
  | "requirements"
  | "clock"
  | "report"
  | "wallet"
  | "users"
  | "settings"
  | "bell"
  | "chat";

export type MainNavLinkDef = {
  href: string;
  label: string;
  iconKey: MainNavIconKey;
  requiredPermission: Permission;
};

export type MainNavClientLink = {
  href: string;
  label: string;
  iconKey: MainNavIconKey;
};

export const MAIN_NAV_LINK_DEFS: MainNavLinkDef[] = [
  { href: "/dashboard", label: "Dashboard", iconKey: "dashboard", requiredPermission: "dashboard.read" },
  { href: "/requirements", label: "Requerimientos", iconKey: "requirements", requiredPermission: "requirements.read" },
  { href: "/time-entries", label: "Horas", iconKey: "clock", requiredPermission: "time_entries.read" },
  { href: "/reports", label: "Reportes", iconKey: "report", requiredPermission: "reports.read" },
  { href: "/budgets", label: "Presupuesto", iconKey: "wallet", requiredPermission: "budgets.read" },
  { href: "/team", label: "Equipo", iconKey: "users", requiredPermission: "team.read" },
  { href: "/chat", label: "Chat", iconKey: "chat", requiredPermission: "chat.read" },
  { href: "/notifications", label: "Avisos", iconKey: "bell", requiredPermission: "notifications.read" },
  { href: "/settings", label: "Configuración", iconKey: "settings", requiredPermission: "settings.read" },
];

/** Resalta la ruta activa sin confundir `/settings/*` con otras rutas. */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/settings") return pathname.startsWith("/settings");
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
