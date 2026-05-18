"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AppSessionUser } from "@/lib/auth/session";

type UserMenuProps = {
  user: AppSessionUser | null;
};

export function UserMenu({ user }: UserMenuProps) {
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

  if (!user) {
    return (
      <span className="hidden text-xs text-muted-foreground sm:inline" title="Sin sesión">
        —
      </span>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="flex max-w-[14rem] items-center gap-2 rounded-[2px] border border-border bg-card px-2 py-1.5 text-left text-sm shadow-sm transition hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-border bg-muted text-xs font-semibold text-foreground">
          {initials || <UserRound className="h-4 w-4" aria-hidden />}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate font-medium text-foreground">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.role}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} aria-hidden />
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
            className="absolute right-0 z-40 mt-1.5 w-52 rounded-[2px] border border-border bg-card py-1.5 shadow-soft"
          >
            <Link
              ref={firstItemRef}
              href="/account"
              role="menuitem"
              className="mx-1 block rounded-[2px] px-3 py-2 text-sm hover:bg-muted"
              onClick={() => close(false)}
            >
              Mi cuenta
            </Link>
            <a
              href="/logout"
              role="menuitem"
              className="mx-1 flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm hover:bg-muted"
              onClick={() => close(false)}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Cerrar sesión
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
