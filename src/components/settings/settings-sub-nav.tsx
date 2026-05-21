"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  Building2,
  Clock,
  Layers,
  ListTree,
  PiggyBank,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const groups: {
  label: string;
  items: { href: string; label: string; icon: typeof Users }[];
}[] = [
  {
    label: "Equipo y datos",
    items: [
      { href: "/settings/profiles", label: "Perfiles y tarifas", icon: BadgeCheck },
      { href: "/settings/users", label: "Usuarios", icon: Users },
      { href: "/settings/clients", label: "Clientes", icon: Building2 },
      { href: "/settings/exchange-rates", label: "UF y dólar (referencia)", icon: Banknote },
    ],
  },
  {
    label: "Catálogos operativos",
    items: [
      { href: "/settings/requirement-statuses", label: "Estados de REQ", icon: ListTree },
      { href: "/settings/priorities", label: "Prioridades", icon: Layers },
      { href: "/settings/time-categories", label: "Categorías de horas", icon: Clock },
      { href: "/settings/budget-scopes", label: "Scopes presupuesto", icon: PiggyBank },
      { href: "/settings/bulk-loads", label: "Cargas masivas", icon: Upload },
    ],
  },
];

export function SettingsSubNav() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-[2px] border px-3 py-2.5 text-left text-sm transition-colors",
      pathname === href
        ? "border-primary bg-primary font-medium text-primary-foreground shadow-soft"
        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
    );

  return (
    <nav aria-label="Secciones de configuración" className="surface-card flex w-full flex-col gap-5 p-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
          <ul className="flex list-none flex-col gap-1">
            {group.items.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.href}>
                  <Link href={tab.href} className={linkClass(tab.href)}>
                    <Icon className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                    <span className="leading-snug">{tab.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
