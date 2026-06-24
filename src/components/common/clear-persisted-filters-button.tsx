"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearStoredTableState } from "@/components/common/data-table";
import { clearPersistedFiltersForPath } from "@/components/layout/filter-state-persistence";

export function ClearPersistedFiltersButton({
  path,
  tableStorageKey,
  className = "btn-secondary",
  children = "Limpiar filtros",
}: {
  path: string;
  tableStorageKey?: string;
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        clearPersistedFiltersForPath(path);
        if (tableStorageKey) clearStoredTableState(tableStorageKey);
        router.replace(path);
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
