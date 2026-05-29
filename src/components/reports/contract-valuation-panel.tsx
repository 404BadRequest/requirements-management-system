"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { KpiCard } from "@/components/common/kpi-card";
import { DataTable } from "@/components/common/data-table";
import { SpendReportTable } from "@/app/reports/spend-report-table";
import type { SpendReportRow } from "@/lib/reports/spend-report";
import type {
  ContractValuationRow,
  ProjectValuationRow,
  ValuationSummaryKpis,
} from "@/lib/reports/contract-valuation-report";
import { DollarSign, Percent, Receipt, TrendingUp } from "lucide-react";

export function ContractValuationPanel({
  kpis,
  contractRows,
  projectRows,
  spendRows,
  ratesFootnote,
}: {
  kpis: ValuationSummaryKpis;
  contractRows: ContractValuationRow[];
  projectRows: ProjectValuationRow[];
  spendRows: SpendReportRow[];
  ratesFootnote: string;
}) {
  const contractColumns = useMemo<ColumnDef<ContractValuationRow>[]>(
    () => [
      { accessorKey: "contractCode", header: "Código" },
      { accessorKey: "contractName", header: "Contrato" },
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "projectName", header: "Proyecto" },
      { accessorKey: "hoursDisplay", header: "Horas", meta: { align: "right" } },
      { accessorKey: "costClpDisplay", header: "Costo CLP", meta: { align: "right" } },
      {
        accessorKey: "markupPercentage",
        header: "Markup %",
        meta: { align: "right" },
        cell: ({ row }) => `${row.original.markupPercentage.toFixed(1)}%`,
      },
      { accessorKey: "revenueClpDisplay", header: "Venta CLP", meta: { align: "right" } },
      {
        accessorKey: "opexPercentage",
        header: "OPEX %",
        meta: { align: "right" },
        cell: ({ row }) => `${row.original.opexPercentage.toFixed(1)}%`,
      },
      { accessorKey: "opexAmountClpDisplay", header: "OPEX CLP", meta: { align: "right" } },
      { accessorKey: "marginClpDisplay", header: "Margen CLP", meta: { align: "right" } },
      { accessorKey: "marginPercentageDisplay", header: "Margen %", meta: { align: "right" } },
    ],
    [],
  );

  const projectColumns = useMemo<ColumnDef<ProjectValuationRow>[]>(
    () => [
      { accessorKey: "projectCode", header: "Código" },
      { accessorKey: "projectName", header: "Proyecto" },
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "hoursDisplay", header: "Horas", meta: { align: "right" } },
      { accessorKey: "costClpDisplay", header: "Costo CLP", meta: { align: "right" } },
      { accessorKey: "revenueClpDisplay", header: "Venta CLP", meta: { align: "right" } },
      { accessorKey: "opexAmountClpDisplay", header: "OPEX CLP", meta: { align: "right" } },
      { accessorKey: "marginClpDisplay", header: "Margen CLP", meta: { align: "right" } },
      { accessorKey: "marginPercentageDisplay", header: "Margen %", meta: { align: "right" } },
      { accessorKey: "contractCount", header: "Contratos", meta: { align: "right" } },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Costo directo" value={kpis.totalCostClpDisplay} helper={`${kpis.totalHoursDisplay} registradas`} icon={Receipt} />
        <KpiCard label="Venta estimada" value={kpis.totalRevenueClpDisplay} helper="Con markup del contrato" icon={TrendingUp} variant="success" />
        <KpiCard label="OPEX total" value={kpis.totalOpexClpDisplay} helper="% operación sobre costo" icon={DollarSign} variant="warning" />
        <KpiCard
          label="Margen neto"
          value={kpis.totalMarginClpDisplay}
          helper={`${kpis.globalMarginPercentageDisplay} sobre venta`}
          icon={Percent}
          variant={kpis.globalMarginPercentage < 20 ? "danger" : kpis.globalMarginPercentage < 40 ? "warning" : "success"}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{ratesFootnote}</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Por contrato</h2>
        <DataTable
          data={contractRows}
          columns={contractColumns}
          globalFilterPlaceholder="Buscar contrato…"
          pageSize={15}
          emptyTitle="Sin valorización por contrato"
          emptyDescription="Las horas deben estar vinculadas a un contrato con tarifa convertible a CLP."
        />
        {contractRows.length > 0 ? (
          <div className="space-y-2">
            {contractRows.slice(0, 3).map((row) => (
              <p key={row.id} className="rounded-[2px] border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{row.contractName}:</span> {row.valuationSummary}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Por proyecto</h2>
        <DataTable
          data={projectRows}
          columns={projectColumns}
          globalFilterPlaceholder="Buscar proyecto…"
          pageSize={15}
          emptyTitle="Sin valorización por proyecto"
          emptyDescription="Registra horas con proyecto y contrato para ver equivalencias financieras."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Detalle financiero</h2>
        <SpendReportTable rows={spendRows} />
      </section>
    </div>
  );
}
