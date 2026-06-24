"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils/cn";

type RowMeta = { align?: "left" | "right" | "center" };

function metaAlign(meta: unknown): RowMeta["align"] | undefined {
  const m = meta as RowMeta | undefined;
  return m?.align;
}

type StoredTableState = {
  sorting: SortingState;
  globalFilter: string;
  pageSizeChoice: string;
  pageIndex: number;
};

function tableStateStorageKey(key: string): string {
  return `rms.table.${key}`;
}

export function clearStoredTableState(key: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(tableStateStorageKey(key));
}

function readStoredTableState(key: string | undefined): StoredTableState | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(tableStateStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTableState>;
    return {
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : [],
      globalFilter: typeof parsed.globalFilter === "string" ? parsed.globalFilter : "",
      pageSizeChoice: typeof parsed.pageSizeChoice === "string" ? parsed.pageSizeChoice : "",
      pageIndex: typeof parsed.pageIndex === "number" && parsed.pageIndex >= 0 ? parsed.pageIndex : 0,
    };
  } catch {
    return null;
  }
}

function resolveStoredPageSize(choice: string, fallback: number): number {
  if (choice === "all") return fallback;
  const parsed = Number(choice);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

type Props<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** Ordenación por cabecera (TanStack Table). Por defecto activo. */
  enableSorting?: boolean;
  /** Búsqueda textual sobre todas las columnas visibles. Por defecto activo. */
  enableGlobalFilter?: boolean;
  globalFilterPlaceholder?: string;
  pageSize?: number;
  /** Opciones del selector de filas por página (ej. 5, 10, 15). */
  pageSizeOptions?: number[];
  /** Muestra select para elegir cuántas filas ver por página, incluida la opción «Todos». */
  enablePageSizeSelector?: boolean;
  /** Mensaje cuando no hay filas en los datos de origen */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Acción opcional en estado vacío (ej. crear, limpiar filtros). */
  emptyAction?: ReactNode;
  /** Mostrar pista de deslizamiento horizontal en móvil. */
  mobileScrollHint?: boolean;
  /** Estado de selección de filas (opcional) */
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updater: any) => void;
  enableRowSelection?: boolean;
  /** Clave para persistir búsqueda, orden, paginación y filas por página (sessionStorage). */
  stateStorageKey?: string;
  /** Texto buscable por fila (etiquetas visibles, no solo códigos internos). */
  getGlobalFilterValue?: (row: TData) => string;
  getRowId?: (originalRow: TData, index: number, parent?: any) => string;
};

function SortGlyph({ state }: { state: false | "asc" | "desc" }) {
  const cls = "h-3.5 w-3.5 shrink-0 opacity-70";
  if (state === "asc") return <ArrowUp className={cls} aria-hidden />;
  if (state === "desc") return <ArrowDown className={cls} aria-hidden />;
  return <ArrowUpDown className={cls} aria-hidden />;
}

export function DataTable<TData>({
  data,
  columns,
  enableSorting = true,
  enableGlobalFilter = true,
  globalFilterPlaceholder = "Buscar en la tabla…",
  pageSize = 15,
  pageSizeOptions = [5, 10, 15],
  enablePageSizeSelector = true,
  emptyTitle = "Sin registros",
  emptyDescription = "No hay filas que mostrar con los criterios actuales.",
  emptyAction,
  mobileScrollHint = true,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = false,
  stateStorageKey,
  getGlobalFilterValue,
  getRowId,
}: Props<TData>) {
  const density = useUiStore((s) => s.density);
  const compact = density === "compact";
  const storedState = useMemo(() => readStoredTableState(stateStorageKey), [stateStorageKey]);
  const [sorting, setSorting] = useState<SortingState>(() => storedState?.sorting ?? []);
  const [globalFilter, setGlobalFilter] = useState(() => storedState?.globalFilter ?? "");
  const initialPageSizeChoice = storedState?.pageSizeChoice || String(pageSize);
  const resolvedPageSizeOptions = useMemo(() => {
    const options = [...pageSizeOptions];
    if (!options.includes(pageSize)) {
      options.push(pageSize);
    }
    const storedSize = resolveStoredPageSize(initialPageSizeChoice, pageSize);
    if (storedSize !== pageSize && !options.includes(storedSize)) {
      options.push(storedSize);
    }
    return [...new Set(options)].sort((a, b) => a - b);
  }, [initialPageSizeChoice, pageSize, pageSizeOptions]);
  const [pageSizeChoice, setPageSizeChoice] = useState<string>(initialPageSizeChoice);
  const [pagination, setPagination] = useState(() => ({
    pageIndex: storedState?.pageIndex ?? 0,
    pageSize: resolveStoredPageSize(initialPageSizeChoice, pageSize),
  }));

  useEffect(() => {
    if (stateStorageKey) return;
    setPageSizeChoice(String(pageSize));
    setPagination({ pageIndex: 0, pageSize });
  }, [pageSize, stateStorageKey]);

  useEffect(() => {
    if (!stateStorageKey || typeof window === "undefined") return;
    const payload: StoredTableState = {
      sorting,
      globalFilter,
      pageSizeChoice,
      pageIndex: pagination.pageIndex,
    };
    sessionStorage.setItem(tableStateStorageKey(stateStorageKey), JSON.stringify(payload));
  }, [globalFilter, pageSizeChoice, pagination.pageIndex, sorting, stateStorageKey]);

  const globalFilterFn = useMemo<FilterFn<TData>>(
    () => (row, _columnId, filterValue) => {
      const needle = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!needle) return true;
      const haystack = getGlobalFilterValue
        ? getGlobalFilterValue(row.original)
        : row.getVisibleCells().map((cell) => String(cell.getValue() ?? "")).join(" ");
      return haystack.toLowerCase().includes(needle);
    },
    [getGlobalFilterValue],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      ...(enableGlobalFilter ? { globalFilter } : {}),
      ...(enableRowSelection && rowSelection ? { rowSelection } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    ...(enableRowSelection && onRowSelectionChange ? { onRowSelectionChange } : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    enableSorting,
    enableGlobalFilter,
    enableRowSelection,
    ...(getRowId ? { getRowId } : {}),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const showingAllRows = enablePageSizeSelector && pageSizeChoice === "all";

  useEffect(() => {
    if (showingAllRows) return;
    const pageCount = Math.max(1, Math.ceil(filteredCount / Math.max(pagination.pageSize, 1)));
    if (pagination.pageIndex >= pageCount) {
      setPagination((current) => ({ ...current, pageIndex: pageCount - 1 }));
    }
  }, [filteredCount, pagination.pageIndex, pagination.pageSize, showingAllRows]);

  useEffect(() => {
    if (!enablePageSizeSelector || pageSizeChoice !== "all") return;
    const nextPageSize = Math.max(filteredCount, 1);
    setPagination((current) => {
      if (current.pageSize === nextPageSize && current.pageIndex === 0) return current;
      return { pageIndex: 0, pageSize: nextPageSize };
    });
  }, [enablePageSizeSelector, pageSizeChoice, filteredCount]);

  const handlePageSizeChoiceChange = (value: string) => {
    setPageSizeChoice(value);
    if (value === "all") {
      setPagination({ pageIndex: 0, pageSize: Math.max(filteredCount, 1) });
      return;
    }
    setPagination({ pageIndex: 0, pageSize: Number(value) });
  };

  const pageIndex = table.getState().pagination.pageIndex;
  const tablePageSize = table.getState().pagination.pageSize;
  const pageCount = Math.max(1, table.getPageCount());
  const from = filteredCount === 0 ? 0 : pageIndex * tablePageSize + 1;
  const to = Math.min((pageIndex + 1) * tablePageSize, filteredCount);

  const showingSummary = (
    <p className={cn("tabular-nums text-muted-foreground", compact ? "text-[13px]" : "text-sm")}>
      Mostrando <span className="font-medium text-foreground">{from}</span>–
      <span className="font-medium text-foreground">{to}</span> de{" "}
      <span className="font-medium text-foreground">{filteredCount}</span>
      {filteredCount !== data.length ? (
        <span className="text-muted-foreground"> (total {data.length})</span>
      ) : null}
    </p>
  );

  const pageSizeSelector = enablePageSizeSelector ? (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
      <span className="whitespace-nowrap">Filas por página</span>
      <select
        className="field-control min-w-[5.5rem] py-1.5 text-xs sm:text-sm"
        value={pageSizeChoice}
        onChange={(event) => handlePageSizeChoiceChange(event.target.value)}
        aria-label="Filas por página"
      >
        {resolvedPageSizeOptions.map((option) => (
          <option key={option} value={String(option)}>
            {option}
          </option>
        ))}
        <option value="all">Todos</option>
      </select>
    </label>
  ) : null;

  const showToolbar = enableGlobalFilter && data.length > 0;

  const emptySource = data.length === 0;
  const emptyFiltered = !emptySource && filteredCount === 0;

  const captionId = useId();

  if (emptySource) {
    return (
      <div className="surface-card p-[length:var(--density-inset-pad)]">
        <div
          className="rounded-[2px] border border-dashed border-border bg-muted/25 px-4 py-[length:var(--density-empty-py)] text-center text-sm text-muted-foreground"
          role="status"
        >
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1">{emptyDescription}</p>
          {emptyAction ? <div className="mt-3 flex justify-center">{emptyAction}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("surface-card p-[length:var(--density-inset-pad)]", compact ? "space-y-2.5" : "space-y-3")}>
      {showToolbar || (enablePageSizeSelector && !emptyFiltered) ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showToolbar ? (
            <div className="relative min-w-[12rem] flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={globalFilterPlaceholder}
                className="field-control w-full rounded-[2px] border-border bg-card py-2.5 pl-10 pr-3 text-sm shadow-sm"
                aria-label="Filtrar tabla"
              />
            </div>
          ) : (
            <div className="flex-1" aria-hidden />
          )}
          {enablePageSizeSelector && !emptyFiltered ? (
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
              {showingSummary}
              {pageSizeSelector}
            </div>
          ) : null}
        </div>
      ) : null}

      {emptyFiltered ? (
        <p className="rounded-[2px] border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground" role="status">
          Ningún resultado coincide con «{globalFilter}». Prueba con otros términos o borra el filtro.
        </p>
      ) : null}

      {mobileScrollHint ? (
        <p className="sm:hidden text-[11px] text-muted-foreground">
          Desliza horizontalmente para ver todas las columnas.
        </p>
      ) : null}

      {!emptyFiltered ? (
        <>
          <div
            className={cn(
              "data-table-shell",
              enablePageSizeSelector
                ? "data-table-shell--expand"
                : compact
                  ? "max-h-[min(62vh,520px)] text-[13px]"
                  : "max-h-[min(72vh,800px)]",
              compact && enablePageSizeSelector ? "text-[13px]" : null,
            )}
          >
            <table aria-describedby={captionId}>
              <caption id={captionId} className="sr-only">
                Tabla de datos con ordenación y paginación.
              </caption>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted();
                      const sortDir = sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined;
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={sortDir}
                          className={cn(metaAlign(header.column.columnDef.meta) === "right" && "text-right")}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              className={cn(
                                "inline-flex w-full items-center gap-1.5 rounded-md px-0 py-0.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground",
                                metaAlign(header.column.columnDef.meta) === "right" && "justify-end text-right",
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortGlyph state={sorted || false} />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(metaAlign(cell.column.columnDef.meta) === "right" && "text-right")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center gap-3 border-t border-border/50 text-muted-foreground",
              enablePageSizeSelector ? "justify-end" : "justify-between",
              compact ? "pt-3 text-[13px]" : "pt-4 text-sm",
            )}
          >
            {!enablePageSizeSelector ? showingSummary : null}
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums sm:text-sm">
                Página {pageIndex + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs sm:text-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || showingAllRows}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs sm:text-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || showingAllRows}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
