"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import type { SpendReportRow } from "@/lib/reports/spend-report";

export function SpendReportTable({ rows }: { rows: SpendReportRow[] }) {
  const columns = useMemo<ColumnDef<SpendReportRow>[]>(
    () => [
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "contractName", header: "Contrato" },
      { accessorKey: "userName", header: "Persona" },
      { accessorKey: "categoryLabel", header: "Categoría" },
      {
        accessorKey: "hours",
        header: "Horas",
        meta: { align: "right" },
        cell: ({ row }) => row.original.hoursDisplay,
      },
      {
        accessorKey: "amountDisplay",
        header: "Importe (moneda perfil)",
        meta: { align: "right" },
      },
      {
        accessorKey: "amountClpDisplay",
        header: "Costo CLP",
        meta: { align: "right" },
      },
      {
        accessorKey: "revenueClpDisplay",
        header: "Venta CLP",
        meta: { align: "right" },
      },
      {
        accessorKey: "marginPercentageDisplay",
        header: "Margen %",
        meta: { align: "right" },
        cell: ({ row }) => {
          const margin = row.original.marginPercentage;
          if (margin === null) return "—";
          const colorClass = margin < 20 ? "text-rose-500" : margin < 40 ? "text-amber-500" : "text-emerald-500";
          return <span className={`font-medium ${colorClass}`}>{row.original.marginPercentageDisplay}</span>;
        }
      },
    ],
    [],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      globalFilterPlaceholder="Buscar en el reporte…"
      pageSize={25}
      emptyTitle="Sin datos en el periodo"
      emptyDescription="Prueba ampliar fechas, quitar el filtro de cliente o verifica que existan horas con requerimiento vinculado."
      emptyAction={
        <Link href="/time-entries?nueva=1" className="btn-primary py-2 text-sm no-underline">
          Registrar horas ahora
        </Link>
      }
    />
  );
}
