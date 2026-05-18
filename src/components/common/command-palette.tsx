"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommandNavItem } from "@/lib/navigation/filter-nav";
import { cn } from "@/lib/utils/cn";

type CommandPaletteProps = {
  items: CommandNavItem[];
};

type PaletteItem = {
  id: string;
  label: string;
  href: string;
  hint?: string;
};

export const CommandPalette = ({ items }: CommandPaletteProps) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "command-palette-listbox";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const baseItems = useMemo<PaletteItem[]>(
    () => items.map((item) => ({ id: item.href, label: item.label, href: item.href })),
    [items],
  );

  const quickActions = useMemo<PaletteItem[]>(() => {
    const hrefs = new Set(items.map((item) => item.href));
    const entries: PaletteItem[] = [];
    if (hrefs.has("/requirements")) {
      entries.push({
        id: "quick-new-requirement",
        label: "Nuevo requerimiento",
        href: "/requirements?nueva=1",
        hint: "Acción rápida",
      });
    }
    if (hrefs.has("/time-entries")) {
      entries.push({
        id: "quick-new-time-entry",
        label: "Nueva imputación",
        href: "/time-entries?nueva=1",
        hint: "Acción rápida",
      });
    }
    if (hrefs.has("/reports")) {
      entries.push({
        id: "quick-open-reports",
        label: "Abrir reportes",
        href: "/reports",
        hint: "Navegación",
      });
    }
    return entries;
  }, [items]);

  const filtered = useMemo(() => {
    const source = [...quickActions, ...baseItems];
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) => item.label.toLowerCase().includes(q));
  }, [baseItems, quickActions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Atajo global: Cmd/Ctrl + K para enfocar búsqueda rápida.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectItem = (item: PaletteItem) => {
    router.push(item.href);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // retraso mínimo para permitir click en opción
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (!open || filtered.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((idx) => (idx + 1) % filtered.length);
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((idx) => (idx - 1 + filtered.length) % filtered.length);
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const selected = filtered[activeIndex];
            if (selected) selectItem(selected);
          }
        }}
        placeholder="Buscar módulo, reporte o vista…"
        className="field-control h-10 w-full rounded-[2px] border-border py-2 pl-3 pr-3 text-sm"
        aria-label="Búsqueda rápida de módulos"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="menu-fade-in absolute mt-1 w-full rounded-[2px] border border-border bg-card p-1.5 shadow-soft"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">Sin resultados para “{query}”.</p>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "block w-full rounded-[2px] px-2.5 py-1.5 text-left text-sm transition-all hover:bg-muted",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectItem(item)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{item.label}</span>
                  {item.hint ? <span className="text-[11px] text-muted-foreground">{item.hint}</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
