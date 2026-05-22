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
  section: "navigation" | "requirements" | "timeEntries";
  label: string;
  href: string;
  hint?: string;
  meta?: string;
};

export const CommandPalette = ({ items }: CommandPaletteProps) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "command-palette-listbox";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteRequirements, setRemoteRequirements] = useState<
    { id: string; title: string; clientName: string; statusLabel: string; href: string }[]
  >([]);
  const [remoteTimeEntries, setRemoteTimeEntries] = useState<
    { id: string; personName: string; date: string; timeRange: string; taskDescription: string; statusLabel: string; href: string }[]
  >([]);

  const baseItems = useMemo<PaletteItem[]>(
    () => items.map((item) => ({ id: item.href, section: "navigation", label: item.label, href: item.href })),
    [items],
  );

  const quickActions = useMemo<PaletteItem[]>(() => {
    const hrefs = new Set(items.map((item) => item.href));
    const entries: PaletteItem[] = [];
    if (hrefs.has("/requirements")) {
      entries.push({
        id: "quick-new-requirement",
        section: "navigation",
        label: "Nuevo requerimiento",
        href: "/requirements?nueva=1",
        hint: "Acción rápida",
      });
    }
    if (hrefs.has("/time-entries")) {
      entries.push({
        id: "quick-new-time-entry",
        section: "navigation",
        label: "Nueva hora",
        href: "/time-entries?nueva=1",
        hint: "Acción rápida",
      });
    }
    if (hrefs.has("/reports")) {
      entries.push({
        id: "quick-open-reports",
        section: "navigation",
        label: "Abrir reportes",
        href: "/reports",
        hint: "Navegación",
      });
    }
    return entries;
  }, [items]);

  const navigationItems = useMemo(() => {
    const source = [...quickActions, ...baseItems];
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) => item.label.toLowerCase().includes(q));
  }, [baseItems, quickActions, query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRemoteRequirements([]);
      setRemoteTimeEntries([]);
      setLoadingRemote(false);
      setRemoteError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingRemote(true);
        setRemoteError(null);
        try {
          const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmed)}`, {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error("No se pudo buscar en este momento.");
          }
          const data = (await response.json()) as {
            requirements?: { id: string; title: string; clientName: string; statusLabel: string; href: string }[];
            timeEntries?: {
              id: string;
              personName: string;
              date: string;
              timeRange: string;
              taskDescription: string;
              statusLabel: string;
              href: string;
            }[];
          };
          setRemoteRequirements(data.requirements ?? []);
          setRemoteTimeEntries(data.timeEntries ?? []);
        } catch (error) {
          if (controller.signal.aborted) return;
          setRemoteRequirements([]);
          setRemoteTimeEntries([]);
          setRemoteError(error instanceof Error ? error.message : "No se pudo buscar.");
        } finally {
          if (!controller.signal.aborted) {
            setLoadingRemote(false);
          }
        }
      })();
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const requirementItems = useMemo<PaletteItem[]>(
    () =>
      remoteRequirements.map((item) => ({
        id: `req-${item.id}`,
        section: "requirements",
        label: `${item.id} · ${item.title}`,
        href: item.href,
        meta: `${item.clientName} · ${item.statusLabel}`,
      })),
    [remoteRequirements],
  );

  const timeEntryItems = useMemo<PaletteItem[]>(
    () =>
      remoteTimeEntries.map((item) => ({
        id: `time-${item.id}`,
        section: "timeEntries",
        label: `${item.id} · ${item.personName}`,
        href: item.href,
        meta: `${item.date} · ${item.timeRange} · ${item.statusLabel}`,
        hint: item.taskDescription,
      })),
    [remoteTimeEntries],
  );

  const sections = useMemo(
    () => [
      { key: "navigation", label: "Navegación", items: navigationItems },
      { key: "requirements", label: "Requerimientos", items: requirementItems },
      { key: "timeEntries", label: "Horas", items: timeEntryItems },
    ],
    [navigationItems, requirementItems, timeEntryItems],
  );

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  useEffect(() => {
    if (flatItems.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => (current >= flatItems.length ? 0 : current));
  }, [flatItems.length]);

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
      <div className="relative">
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
            if (!open || flatItems.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((idx) => (idx + 1) % flatItems.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((idx) => (idx - 1 + flatItems.length) % flatItems.length);
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const selected = flatItems[activeIndex];
              if (selected) selectItem(selected);
            }
          }}
          placeholder="Buscar módulos, requerimientos u horas…"
          className="field-control h-10 w-full rounded-[2px] border-border py-2 pl-3 pr-16 text-sm"
          aria-label="Búsqueda rápida de módulos"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </div>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="menu-fade-in absolute z-[70] mt-1 max-h-[70vh] w-full overflow-y-auto rounded-[2px] border border-border bg-card p-1.5 shadow-soft"
        >
          {loadingRemote ? <p className="px-2 py-1 text-sm text-muted-foreground">Buscando…</p> : null}
          {remoteError ? <p className="px-2 py-1 text-sm text-destructive">{remoteError}</p> : null}
          {flatItems.length === 0 && !loadingRemote && !remoteError ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">Sin resultados para “{query}”.</p>
          ) : (
            sections.map((section) => {
              if (section.items.length === 0) return null;
              return (
                <div key={section.key} className="mb-2 last:mb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
                  {section.items.map((item) => {
                    const index = flatItems.findIndex((flatItem) => flatItem.id === item.id);
                    const isNavigationItem = item.section === "navigation";
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={index === activeIndex}
                        className={cn(
                          "block w-full rounded-[2px] border border-transparent px-2.5 py-2 text-left text-sm transition-all hover:border-border hover:bg-muted/70",
                          index === activeIndex && "border-primary/35 bg-primary/10 text-foreground",
                        )}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectItem(item)}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate font-medium">{item.label}</span>
                          {isNavigationItem && item.hint ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{item.hint}</span>
                          ) : null}
                        </span>
                        {item.meta ? <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.meta}</span> : null}
                        {!isNavigationItem && item.hint ? (
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/90">{item.hint}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};
