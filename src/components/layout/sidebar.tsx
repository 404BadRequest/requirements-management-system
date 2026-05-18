"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isNavActive, type MainNavClientLink } from "@/components/layout/nav-links";
import { MainNavIcon } from "@/components/layout/main-nav-icon";

type SidebarProps = {
  links: MainNavClientLink[];
  notificationUnread?: number;
};

const NAV_SECTIONS: { label: string; hrefs: string[] }[] = [
  { label: "Principal", hrefs: ["/dashboard", "/requirements", "/time-entries"] },
  { label: "Análisis", hrefs: ["/reports", "/budgets", "/team"] },
  { label: "Sistema", hrefs: ["/notifications", "/settings"] },
];

export const Sidebar = ({ links, notificationUnread = 0 }: SidebarProps) => {
  const pathname = usePathname();

  const linksByHref = new Map(links.map((l) => [l.href, l]));

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-card/95 backdrop-blur lg:flex"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <LayoutGrid className="h-4 w-4 text-primary-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight tracking-tight text-foreground">Requirement System TI</p>
          <p className="text-[11px] leading-tight text-muted-foreground">Plataforma de gestión</p>
        </div>
      </div>

      <div className="mx-3 mt-3 rounded-lg border border-border/70 bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          All systems operational
        </p>
        <p className="mt-1 text-[11px]">Last sync available in header.</p>
      </div>

      {/* Navigation by sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" aria-label="Navegación principal">
        {NAV_SECTIONS.map((section) => {
          const sectionLinks = section.hrefs.map((h) => linksByHref.get(h)).filter(Boolean) as MainNavClientLink[];
          if (sectionLinks.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {section.label}
              </p>
              <ul className="space-y-0.5" role="list">
                {sectionLinks.map((link) => {
                  const active = isNavActive(pathname, link.href);
                  const showBadge = link.href === "/notifications" && notificationUnread > 0;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "border-l-[var(--sidebar-active-border)] border-l-primary bg-accent text-foreground shadow-sm"
                            : "border-l-[var(--sidebar-active-border)] border-l-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <MainNavIcon
                          iconKey={link.iconKey}
                          className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-60")}
                        />
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{link.label}</span>
                          {showBadge ? (
                            <span
                              className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground tabular-nums"
                              aria-label={`${notificationUnread} sin leer`}
                            >
                              {notificationUnread > 99 ? "99+" : notificationUnread}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
