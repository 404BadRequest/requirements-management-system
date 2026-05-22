"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Zap, Plus, Clock, LayoutDashboard, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function QuickActionsMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-2 rounded-[2px] border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Zap className="h-4 w-4 text-primary" aria-hidden />
        <span className="hidden sm:inline">Acciones rápidas</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Cerrar menú"
            onClick={() => close(false)}
          />
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-40 mt-1.5 w-56 rounded-[2px] border border-border bg-card py-1.5 shadow-soft"
          >
            <Link
              ref={firstItemRef}
              href="/requirements?nueva=1"
              role="menuitem"
              className="mx-1 flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm hover:bg-muted"
              onClick={() => close(false)}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Crear requerimiento
            </Link>
            <Link
              href="/time-entries?nueva=1"
              role="menuitem"
              className="mx-1 flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm hover:bg-muted"
              onClick={() => close(false)}
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              Registrar hora
            </Link>
            <Link
              href="/time-entries/weekly"
              role="menuitem"
              className="mx-1 flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm hover:bg-muted"
              onClick={() => close(false)}
            >
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
              Horas semanales
            </Link>
            <div className="my-1 h-px bg-border" role="separator" />
            <Link
              href="/requirements/kanban"
              role="menuitem"
              className="mx-1 flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm hover:bg-muted"
              onClick={() => close(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Ver Kanban
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
