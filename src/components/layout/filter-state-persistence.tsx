"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PersistRule = {
  /** Ruta exacta donde aplica la regla (ej. "/reports"). */
  path: string;
  /** Parámetros de query a persistir para la ruta. */
  params: string[];
};

const RULES: PersistRule[] = [
  { path: "/dashboard", params: ["clientId"] },
  { path: "/requirements", params: ["clientId"] },
  { path: "/requirements/kanban", params: ["clientId"] },
  { path: "/reports", params: ["clientId"] },
  { path: "/time-entries", params: ["clientId", "projectId", "userId", "category"] },
  { path: "/time-entries/weekly", params: ["userId"] },
  { path: "/budgets", params: ["clientId"] },
  { path: "/team", params: ["role"] },
  { path: "/notifications", params: ["status"] },
];

function storageKey(path: string, param: string): string {
  return `rms.filters.${path}.${param}`;
}

export function FilterStatePersistence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const rule = RULES.find((r) => pathname === r.path);
    if (!rule) return;

    const next = new URLSearchParams(searchParams.toString());
    let shouldReplace = false;

    for (const param of rule.params) {
      const key = storageKey(rule.path, param);
      const hasParam = next.has(param);
      const value = (next.get(param) ?? "").trim();

      if (hasParam) {
        // Persistimos el filtro activo o limpiamos si viene vacío explícito.
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
        continue;
      }

      // Si la URL no trae el filtro, intentamos rehidratar desde localStorage.
      const saved = (localStorage.getItem(key) ?? "").trim();
      if (saved) {
        next.set(param, saved);
        shouldReplace = true;
      }
    }

    if (shouldReplace) {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  return null;
}

