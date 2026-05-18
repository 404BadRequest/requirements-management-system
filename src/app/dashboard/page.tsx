import { BillingEstimateByClientTable } from "@/components/dashboard/billing-estimate-by-client";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { RiskBadge } from "@/components/common/badges";
import { AppShell } from "@/components/layout/app-shell";
import { CheckCircle2, CircleDot, Clock, PieChart, AlertCircle } from "lucide-react";
import { getCatalogByKind, getClients, getDashboardMetrics, getFinancialReferenceRates } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { formatFinancialReferenceRatesFootnote } from "@/lib/formatting/reference-rates-footnote";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import type { SettingsCatalogEntry } from "@/types/domain";

function catalogLabelByCode(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return entry?.label ?? code;
}

function mapRecordKeysToLabels(
  record: Record<string, number>,
  catalog: SettingsCatalogEntry[],
  formatter?: (code: string, label: string) => string,
): { name: string; value: number }[] {
  return Object.entries(record).map(([code, value]) => ({
    name: formatter ? formatter(code, catalogLabelByCode(catalog, code)) : catalogLabelByCode(catalog, code),
    value,
  }));
}

function recordToHoursChartData(record: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(record).map(([name, minutes]) => ({
    name,
    value: Math.round(minutes / 60),
  }));
}

function sortedMonthHours(record: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, minutes]) => ({ name, value: Math.round(minutes / 60) }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePermission("dashboard.read");
  const { clientId = "" } = await searchParams;
  const [clientList, referenceRates, requirementStatuses, requirementPriorities, timeEntryCategories] = await Promise.all([
    getClients(),
    getFinancialReferenceRates(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
    getCatalogByKind("time_entry_category"),
  ]);
  const activeClients = clientList.filter((c) => c.active);
  const metrics = await getDashboardMetrics({
    clientId: clientId || undefined,
  });

  const statusChartData = mapRecordKeysToLabels(metrics.byStatus, requirementStatuses, formatStatusLabel);
  const priorityChartData = mapRecordKeysToLabels(metrics.byPriority, requirementPriorities);
  const categoryHoursChartData = Object.entries(metrics.hoursByCategory).map(([code, minutes]) => ({
    name: catalogLabelByCode(timeEntryCategories, code),
    value: Math.round(minutes / 60),
  }));
  const allChartsEmpty =
    sortedMonthHours(metrics.hoursByMonth).every((item) => item.value <= 0) &&
    priorityChartData.every((item) => item.value <= 0) &&
    recordToHoursChartData(metrics.hoursByClient).every((item) => item.value <= 0) &&
    statusChartData.every((item) => item.value <= 0) &&
    categoryHoursChartData.every((item) => item.value <= 0) &&
    recordToHoursChartData(metrics.hoursByPerson).every((item) => item.value <= 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Dashboard general" description="Visión consolidada de requerimientos, horas y presupuesto" />
        <form
          className="surface-card flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)] sm:flex-nowrap sm:items-center"
          action="/dashboard"
          method="get"
        >
          <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
            <label htmlFor="client-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filtrar por cliente
            </label>
            <select id="client-filter" name="clientId" defaultValue={clientId} className="field-control w-full max-w-md">
              <option value="">Todos los clientes</option>
              {activeClients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Aplicar filtro
          </button>
        </form>

        <section aria-labelledby="dash-kpis-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="dash-kpis-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Indicadores clave
            </h2>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Riesgo operativo: <RiskBadge risk={metrics.risk} />
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total requerimientos" value={String(metrics.totalRequirements)} icon={PieChart} variant="default" />
            <KpiCard label="Abiertos" value={String(metrics.openRequirements)} icon={CircleDot} variant="info" />
            <KpiCard label="Finalizados" value={String(metrics.completedRequirements)} icon={CheckCircle2} variant="success" />
            <KpiCard
              label="Consumo presupuesto"
              value={`${metrics.consumptionPercentage.toFixed(1)}%`}
              helper="Frente al presupuesto cotizado"
              icon={Clock}
              variant={metrics.consumptionPercentage >= 90 ? "danger" : metrics.consumptionPercentage >= 70 ? "warning" : "default"}
            />
          </div>
        </section>

        <BillingEstimateByClientTable
          rows={metrics.billingEstimateByClient}
          referenceFootnote={formatFinancialReferenceRatesFootnote(referenceRates)}
        />

        <section aria-labelledby="dash-charts-heading" className="space-y-5">
          <h2 id="dash-charts-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Análisis visual
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Gráficos combinados (línea, roseta, dona, barras verticales y horizontales) según los mismos filtros. Las horas se muestran
            redondeadas en unidades de hora.
          </p>
          {allChartsEmpty ? (
            <div className="surface-card flex items-start gap-3 border-dashed p-4">
              <div className="mt-0.5 rounded-[2px] border border-border bg-muted/60 p-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Panel sin datos para los filtros actuales</p>
                <p className="text-sm text-muted-foreground">
                  Crea requerimientos, registra horas y asignaciones de presupuesto, o ajusta cliente para ver tendencia y
                  distribuciones.
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-12">
            <DashboardChartCard
              className="lg:col-span-12"
              title="Evolución de horas cargadas por mes"
              mode="lineArea"
              tall
              emptyHint="Registra imputaciones de tiempo para ver la evolucion mensual."
              data={sortedMonthHours(metrics.hoursByMonth)}
            />
            <DashboardChartCard
              className="lg:col-span-5"
              title="Requerimientos por prioridad"
              mode="rose"
              emptyHint="Crea requerimientos para visualizar la distribucion por prioridad."
              data={priorityChartData}
            />
            <DashboardChartCard
              className="lg:col-span-7"
              title="Horas por cliente"
              mode="barHorizontal"
              emptyHint="Registra horas asociadas a requerimientos para mostrar clientes con consumo."
              data={recordToHoursChartData(metrics.hoursByClient)}
            />
            <DashboardChartCard
              className="lg:col-span-6"
              title="Requerimientos por estado"
              mode="pie"
              emptyHint="Cuando existan requerimientos, aqui se mostrara la proporcion por estado."
              data={statusChartData}
            />
            <DashboardChartCard
              className="lg:col-span-6"
              title="Horas por categoría de imputación"
              mode="bar"
              barVariant="multiColor"
              emptyHint="Asigna categoria al registrar horas para analizar la distribucion de imputaciones."
              data={categoryHoursChartData}
            />
            <DashboardChartCard
              className="lg:col-span-12"
              title="Horas por persona"
              mode="barHorizontal"
              emptyHint="Las horas por persona apareceran cuando existan registros de imputacion."
              data={recordToHoursChartData(metrics.hoursByPerson)}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
