"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
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

type Props<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** Ordenación por cabecera (TanStack Table). Por defecto activo. */
  enableSorting?: boolean;
  /** Búsqueda textual sobre todas las columnas visibles. Por defecto activo. */
  enableGlobalFilter?: boolean;
  globalFilterPlaceholder?: string;
  pageSize?: number;
  /** Mensaje cuando no hay filas en los datos de origen */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Acción opcional en estado vacío (ej. crear, limpiar filtros). */
  emptyAction?: ReactNode;
  /** Mostrar pista de deslizamiento horizontal en móvil. */
  mobileScrollHint?: boolean;
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
  emptyTitle = "Sin registros",
  emptyDescription = "No hay filas que mostrar con los criterios actuales.",
  emptyAction,
  mobileScrollHint = true,
}: Props<TData>) {
  const density = useUiStore((s) => s.density);
  const compact = density === "compact";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: enableGlobalFilter ? { sorting, globalFilter } : { sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    enableSorting,
    enableGlobalFilter,
    initialState: { pagination: { pageSize } },
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const tablePageSize = table.getState().pagination.pageSize;
  const pageCount = Math.max(1, table.getPageCount());
  const filteredCount = table.getFilteredRowModel().rows.length;
  const from = filteredCount === 0 ? 0 : pageIndex * tablePageSize + 1;
  const to = Math.min((pageIndex + 1) * tablePageSize, filteredCount);

  const showToolbar = enableGlobalFilter && data.length > 0;

  const emptySource = data.length === 0;
  const emptyFiltered = !emptySource && filteredCount === 0;

  const captionId = useId();

  if (emptySource) {
    return (
      <div className="surface-card p-4 sm:p-5">
        <div
          className="rounded-[2px] border border-dashed border-border bg-muted/25 px-6 py-12 text-center text-sm text-muted-foreground"
          role="status"
        >
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1">{emptyDescription}</p>
          {emptyAction ? <div className="mt-4 flex justify-center">{emptyAction}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("surface-card p-4 sm:p-5", compact ? "space-y-3" : "space-y-4")}>
      {showToolbar ? (
        <div className="relative max-w-md">
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
              compact ? "max-h-[min(62vh,520px)] text-[13px]" : "max-h-[min(72vh,800px)]",
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
              "flex flex-wrap items-center justify-between gap-3 border-t border-border/50 text-muted-foreground",
              compact ? "pt-3 text-[13px]" : "pt-4 text-sm",
            )}
          >
            <p className="tabular-nums">
              Mostrando <span className="font-medium text-foreground">{from}</span>–
              <span className="font-medium text-foreground">{to}</span> de{" "}
              <span className="font-medium text-foreground">{filteredCount}</span>
              {filteredCount !== data.length ? (
                <span className="text-muted-foreground"> (total {data.length})</span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums sm:text-sm">
                Página {pageIndex + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs sm:text-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs sm:text-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
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
