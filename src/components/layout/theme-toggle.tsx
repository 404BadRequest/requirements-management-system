"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";

type ThemeChoice = "light" | "dark" | "system";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemePreferenceSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="field-control inline-flex h-10 w-40 skeleton-shimmer" aria-hidden />;
  }

  return (
    <select
      value={(theme as ThemeChoice | undefined) ?? "system"}
      className="field-control py-1.5 pr-8 text-xs sm:text-sm"
      aria-label="Tema de la interfaz"
      onChange={(event) => setTheme(event.target.value as ThemeChoice)}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!mounted) {
    return <span className="inline-flex h-9 w-9 shrink-0 rounded-[2px] border border-border bg-card skeleton-shimmer" aria-hidden />;
  }

  const activeChoice = (theme as ThemeChoice | undefined) ?? "system";
  const ActiveIcon =
    activeChoice === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Cambiar tema"
        title="Tema de la interfaz"
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveIcon className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Cerrar selector de tema" onClick={() => close(false)} />
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-40 mt-1.5 w-44 rounded-[2px] border border-border bg-card py-1.5 shadow-soft"
          >
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = activeChoice === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={cn(
                    "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-[2px] px-3 py-2 text-left text-sm transition hover:bg-muted",
                    selected && "bg-muted font-medium text-foreground",
                  )}
                  onClick={() => {
                    setTheme(option.value);
                    close(false);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
