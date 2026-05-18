"use client";

import { useMemo, type CSSProperties } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { BillingEstimateRow } from "@/lib/calculations/billing";
import { formatBillingLineTotal } from "@/lib/formatting/rates";
import { DataTable } from "@/components/common/data-table";

type BillingRow = BillingEstimateRow & { id: string };

export function BillingEstimateByClientTable({
  rows,
  referenceFootnote,
}: {
  rows: BillingEstimateRow[];
  /** Texto opcional (p. ej. UF/USD de referencia desde configuración). */
  referenceFootnote?: string;
}) {
  const data = useMemo<BillingRow[]>(
    () => rows.map((row, index) => ({ ...row, id: `${row.client}-${row.currency}-${index}` })),
    [rows],
  );

  const columns = useMemo<ColumnDef<BillingRow>[]>(
    () => [
      {
        accessorKey: "client",
        header: "Cliente",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.client}</span>,
      },
      {
        accessorKey: "currency",
        header: "Unidad tarifa",
        cell: ({ row }) => (
          <span className="rounded-[2px] border border-border bg-muted/80 px-2 py-0.5 text-xs font-medium tabular-nums">
            {row.original.currency}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Monto (moneda perfil)",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-foreground">
            {formatBillingLineTotal(row.original.amount, row.original.currency)}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "amountClp",
        header: "Equivalente CLP",
        meta: { align: "right" },
        accessorFn: (row) => row.amountClp ?? -1,
        cell: ({ row }) => {
          const v = row.original.amountClp;
          return v != null ? (
            <span className="font-medium tabular-nums text-foreground">{formatBillingLineTotal(v, "CLP")}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        sortingFn: "basic",
      },
    ],
    [],
  );

  if (!rows.length) {
    return (
      <article className="surface-card border-dashed p-6 text-sm leading-relaxed text-muted-foreground">
        No hay montos estimados con los filtros actuales (por ejemplo, sin imputaciones o sin perfil asignado al usuario).
      </article>
    );
  }

  return (
    <section className="surface-card overflow-hidden p-0">
      <div className="density-billing-bar border-b border-border/60 bg-muted/25 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">Estimado facturable por cliente</h3>
            <p className="max-w-prose text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Suma de horas imputadas × tarifa del perfil. Cada fila muestra el monto en la moneda del perfil y el equivalente en CLP
              cuando la moneda es CLP, UF o USD (UF y USD usan las tasas de configuración).
              {referenceFootnote ? (
                <>
                  {" "}
                  <span className="block pt-1 text-[11px] text-muted-foreground/95 sm:inline sm:pt-0">{referenceFootnote}</span>
                </>
              ) : null}
            </p>
          </div>
          <span className="shrink-0 rounded-[2px] border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {rows.length} líneas
          </span>
        </div>
      </div>
      <div className="border-t border-border/40 p-4 sm:p-5">
        <div
          style={
            {
              "--density-table-th-py": "0.62rem",
              "--density-table-th-px": "0.9rem",
              "--density-table-td-py": "0.58rem",
              "--density-table-td-px": "0.9rem",
            } as CSSProperties
          }
        >
          <DataTable
            data={data}
            columns={columns}
            globalFilterPlaceholder="Buscar cliente o unidad de tarifa…"
            pageSize={12}
            mobileScrollHint={false}
          />
        </div>
      </div>
    </section>
  );
}
