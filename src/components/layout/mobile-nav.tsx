"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isNavActive, type MainNavClientLink } from "@/components/layout/nav-links";
import { MainNavIcon } from "@/components/layout/main-nav-icon";

type MobileNavProps = {
  links: MainNavClientLink[];
};

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
        return;
      }
      if (e.key !== "Tab") return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-[2px] border border-border bg-background p-2 text-foreground shadow-sm transition hover:bg-muted lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden />
        <span className="sr-only">Abrir menú de navegación</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20"
            aria-label="Cerrar menú"
            onClick={() => closeMenu(true)}
          />
          <nav
            id="mobile-nav-drawer"
            ref={drawerRef}
            className="absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-r border-border bg-card shadow-soft"
            aria-label="Navegación móvil"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Requirement</p>
                <p className="text-base font-bold tracking-tight">System TI</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded-[2px] p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => closeMenu(true)}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {links.map((link) => {
                const active = isNavActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[2px] px-3 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border border-primary bg-primary text-primary-foreground shadow-soft"
                        : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => closeMenu(false)}
                  >
                    <MainNavIcon iconKey={link.iconKey} className="h-4 w-4 shrink-0 opacity-90" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
