"use client";

import Link from "next/link";
import { Clock, FolderKanban, Layers, UserRound, Wallet } from "lucide-react";
import { KpiCard } from "@/components/common/kpi-card";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import { HoursByDimensionTable } from "@/components/reports/hours-by-dimension-table";
import { ContractValuationPanel } from "@/components/reports/contract-valuation-panel";
import type {
  HoursByProfileRow,
  HoursByProjectRow,
  HoursByUserRow,
  HoursReportSummary,
} from "@/lib/reports/hours-aggregations";
import type { SpendReportRow } from "@/lib/reports/spend-report";
import type {
  ContractValuationRow,
  ProjectValuationRow,
  ValuationSummaryKpis,
} from "@/lib/reports/contract-valuation-report";
import { cn } from "@/lib/utils/cn";

export type ReportsTab = "resumen" | "perfil" | "persona" | "proyecto" | "valorizacion";

const TAB_ITEMS: { id: ReportsTab; label: string; icon: typeof Clock; adminOnly?: boolean }[] = [
  { id: "resumen", label: "Resumen", icon: Clock },
  { id: "perfil", label: "Por perfil", icon: Layers },
  { id: "persona", label: "Por persona", icon: UserRound },
  { id: "proyecto", label: "Por proyecto", icon: FolderKanban },
  { id: "valorizacion", label: "Valorización", icon: Wallet, adminOnly: true },
];

function buildTabHref(tab: ReportsTab, queryBase: string): string {
  const q = new URLSearchParams(queryBase);
  q.set("tab", tab);
  return `/reports?${q.toString()}`;
}

function TopFiveTable({
  title,
  rows,
  tab,
  queryBase,
  columns,
}: {
  title: string;
  rows: { label: string; value: string; helper?: string }[];
  tab: ReportsTab;
  queryBase: string;
  columns: string[];
}) {
  return (
    <article className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Link href={buildTabHref(tab, queryBase)} className="text-xs font-medium text-primary hover:underline">
          Ver todo
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {columns.map((col) => (
                  <th key={col} className="pb-2 pr-3 font-semibold last:pr-0">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground">{row.label}</td>
                  <td className="py-2 pr-3 tabular-nums text-right">{row.value}</td>
                  {row.helper ? <td className="py-2 text-right text-muted-foreground">{row.helper}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export function ReportsPageClient({
  activeTab,
  queryBase,
  canViewValuation,
  summary,
  byProfile,
  byUser,
  byProject,
  valuationKpis,
  contractValuation,
  projectValuation,
  spendRows,
  ratesFootnote,
}: {
  activeTab: ReportsTab;
  queryBase: string;
  canViewValuation: boolean;
  summary: HoursReportSummary;
  byProfile: HoursByProfileRow[];
  byUser: HoursByUserRow[];
  byProject: HoursByProjectRow[];
  valuationKpis: ValuationSummaryKpis;
  contractValuation: ContractValuationRow[];
  projectValuation: ProjectValuationRow[];
  spendRows: SpendReportRow[];
  ratesFootnote: string;
}) {
  const visibleTabs = TAB_ITEMS.filter((tab) => !tab.adminOnly || canViewValuation);
  const safeTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : "resumen";

  return (
    <div className="space-y-4">
      <nav aria-label="Secciones del reporte" className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = safeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={buildTabHref(tab.id, queryBase)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[2px] border px-3 py-2 text-sm no-underline transition-colors",
                active
                  ? "border-primary bg-primary font-medium text-primary-foreground shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {safeTab === "resumen" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Horas totales" value={summary.totalHoursDisplay} helper="Periodo filtrado" icon={Clock} />
            <KpiCard label="Personas activas" value={String(summary.activePeople)} helper="Con horas registradas" icon={UserRound} variant="info" />
            <KpiCard label="Proyectos con actividad" value={String(summary.activeProjects)} helper="Con al menos 1 hora" icon={FolderKanban} />
            <KpiCard
              label="Horas facturables"
              value={summary.billableHoursDisplay}
              helper={`${summary.nonBillableHoursDisplay} no facturables`}
              icon={Layers}
              variant="success"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardChartCard
              title="Horas por perfil"
              data={summary.chartByProfile}
              mode="pie"
              emptyHint="No hay horas registradas en el periodo seleccionado."
            />
            <DashboardChartCard
              title="Top proyectos por horas"
              data={summary.chartByProject}
              mode="barHorizontal"
              emptyHint="No hay horas asociadas a proyectos en el periodo."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TopFiveTable
              title="Top perfiles"
              tab="perfil"
              queryBase={queryBase}
              columns={["Perfil", "Horas", "%"]}
              rows={summary.topProfiles.map((row) => ({
                label: row.profileName,
                value: row.hoursDisplay,
                helper: row.sharePercentDisplay,
              }))}
            />
            <TopFiveTable
              title="Top personas"
              tab="persona"
              queryBase={queryBase}
              columns={["Persona", "Horas", "%"]}
              rows={summary.topUsers.map((row) => ({
                label: row.userName,
                value: row.hoursDisplay,
                helper: row.sharePercentDisplay,
              }))}
            />
            <TopFiveTable
              title="Top proyectos"
              tab="proyecto"
              queryBase={queryBase}
              columns={["Proyecto", "Horas", "%"]}
              rows={summary.topProjects.map((row) => ({
                label: row.projectName,
                value: row.hoursDisplay,
                helper: row.sharePercentDisplay,
              }))}
            />
          </div>
        </div>
      ) : null}

      {safeTab === "perfil" ? (
        <div className="space-y-4">
          <DashboardChartCard
            title="Distribución por perfil"
            data={byProfile.slice(0, 10).map((row) => ({ name: row.profileName, value: row.hours }))}
            mode="barHorizontal"
            emptyHint="No hay horas por perfil en el periodo."
          />
          <HoursByDimensionTable dimension="profile" profileRows={byProfile} userRows={byUser} projectRows={byProject} />
        </div>
      ) : null}

      {safeTab === "persona" ? (
        <div className="space-y-4">
          <DashboardChartCard
            title="Horas por persona"
            data={byUser.slice(0, 10).map((row) => ({ name: row.userName, value: row.hours }))}
            mode="barHorizontal"
            emptyHint="No hay horas por persona en el periodo."
          />
          <HoursByDimensionTable dimension="user" profileRows={byProfile} userRows={byUser} projectRows={byProject} />
        </div>
      ) : null}

      {safeTab === "proyecto" ? (
        <div className="space-y-4">
          <DashboardChartCard
            title="Horas por proyecto"
            data={byProject.slice(0, 10).map((row) => ({ name: row.projectName, value: row.hours }))}
            mode="barHorizontal"
            emptyHint="No hay horas por proyecto en el periodo."
          />
          <HoursByDimensionTable dimension="project" profileRows={byProfile} userRows={byUser} projectRows={byProject} />
        </div>
      ) : null}

      {safeTab === "valorizacion" && canViewValuation ? (
        <ContractValuationPanel
          kpis={valuationKpis}
          contractRows={contractValuation}
          projectRows={projectValuation}
          spendRows={spendRows}
          ratesFootnote={ratesFootnote}
        />
      ) : null}
    </div>
  );
}
