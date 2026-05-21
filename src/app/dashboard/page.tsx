import { BillingEstimateByClientTable } from "@/components/dashboard/billing-estimate-by-client";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { RiskBadge } from "@/components/common/badges";
import { AppShell } from "@/components/layout/app-shell";
import { UtilizationPanel, type UtilizationData } from "@/components/reports/utilization-panel";
import Link from "next/link";
import { CircleDot, Clock, PieChart, AlertCircle, Users, AlertTriangle, Timer, CalendarClock, CheckCircle2 } from "lucide-react";
import { getCatalogByKind, getClients, getDashboardMetrics, getFinancialReferenceRates, getUsers } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
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
    value: Number((minutes / 60).toFixed(2)),
  }));
}

function sortedMonthHours(record: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(record)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, minutes]) => ({ name, value: Number((minutes / 60).toFixed(2)) }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const sessionUser = await requirePermission("dashboard.read");
  const isContributor = sessionUser.role === "Contributor";
  const isProjectManager = sessionUser.role === "Project Manager";
  const isAdminLike = sessionUser.role === "Admin" || sessionUser.role === "Viewer";
  const { clientId = "" } = await searchParams;
  const [clientList, referenceRates, requirementStatuses, requirementPriorities, timeEntryCategories, users] = await Promise.all([
    getClients(),
    getFinancialReferenceRates(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
    getCatalogByKind("time_entry_category"),
    getUsers(),
  ]);
  const resolvedUserId = resolveDirectoryUserIdForSession(sessionUser, users);
  const activeClients = clientList.filter((c) => c.active);
  const metrics = await getDashboardMetrics({
    ownerId: isContributor ? resolvedUserId : undefined,
    clientId: clientId || undefined,
  });

  const statusChartData = mapRecordKeysToLabels(metrics.byStatus, requirementStatuses, formatStatusLabel);
  const priorityChartData = mapRecordKeysToLabels(metrics.byPriority, requirementPriorities);
  const categoryHoursChartData = Object.entries(metrics.hoursByCategory).map(([code, minutes]) => ({
    name: catalogLabelByCode(timeEntryCategories, code),
    value: Number((minutes / 60).toFixed(2)),
  }));
  const monthHours = sortedMonthHours(metrics.hoursByMonth);
  const byClientHours = recordToHoursChartData(metrics.hoursByClient);
  const byPersonHours = recordToHoursChartData(metrics.hoursByPerson);

  // Preparar datos de utilización (asumiendo 40h semanales = 160h mensuales como capacidad base para el demo)
  const utilizationData: UtilizationData[] = Object.entries(metrics.hoursByPerson).map(([name, minutes]) => {
    const user = users.find(u => u.name === name);
    return {
      userId: user?.id ?? name,
      userName: name,
      role: user?.role ?? "Desconocido",
      loggedHours: minutes / 60,
      capacityHours: 160, // En un sistema real esto vendría de la configuración del usuario
    };
  });

  const roleChartSets = isContributor
    ? [monthHours, categoryHoursChartData, priorityChartData]
    : isProjectManager
      ? [monthHours, byPersonHours, statusChartData]
      : [monthHours, byClientHours, statusChartData];
  const allChartsEmpty = roleChartSets.every((set) => set.every((item) => item.value <= 0));

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={isContributor ? "Mi dashboard" : isProjectManager ? "Dashboard de operación" : "Dashboard general"}
          description={
            isContributor
              ? "Seguimiento personal de carga, pendientes y foco semanal."
              : isProjectManager
                ? "Control operativo del equipo: avance, carga y alertas de ejecución."
                : "Visión ejecutiva de cartera: avance global, consumo y riesgo."
          }
        />
        {!isContributor ? (
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
        ) : null}

        <section aria-labelledby="dash-kpis-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="dash-kpis-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Indicadores clave
            </h2>
            {!isContributor ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                Riesgo operativo: <RiskBadge risk={metrics.risk} />
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isAdminLike ? (
              <>
                <KpiCard label="Total requerimientos" value={String(metrics.roleViews.adminView.kpis.totalRequirements)} icon={PieChart} variant="default" />
                <KpiCard label="Abiertos" value={String(metrics.roleViews.adminView.kpis.openRequirements)} icon={CircleDot} variant="info" />
                <KpiCard
                  label="Horas registradas"
                  value={`${metrics.roleViews.adminView.kpis.totalHours.toFixed(2)} h`}
                  helper="Acumulado según filtros activos"
                  icon={Users}
                  variant="default"
                />
                <KpiCard
                  label="Consumo presupuesto"
                  value={`${metrics.roleViews.adminView.kpis.consumptionPercentage.toFixed(1)}%`}
                  helper="Frente al presupuesto cotizado"
                  icon={Clock}
                  variant={
                    metrics.roleViews.adminView.kpis.consumptionPercentage >= 90
                      ? "danger"
                      : metrics.roleViews.adminView.kpis.consumptionPercentage >= 70
                        ? "warning"
                        : "default"
                  }
                />
              </>
            ) : null}
            {isProjectManager ? (
              <>
                <KpiCard label="Requerimientos abiertos" value={String(metrics.roleViews.pmView.kpis.openRequirements)} icon={CircleDot} variant="info" />
                <KpiCard
                  label="Finalizados (7 días)"
                  value={String(metrics.roleViews.pmView.kpis.completedLast7Days)}
                  helper="Throughput semanal"
                  icon={CheckCircle2}
                  variant="success"
                />
                <KpiCard
                  label="Horas en curso"
                  value={String(metrics.roleViews.pmView.kpis.openTimeEntriesCount)}
                  helper="Registros sin hora de término"
                  icon={Timer}
                  variant={metrics.roleViews.pmView.kpis.openTimeEntriesCount > 0 ? "warning" : "default"}
                />
                <KpiCard
                  label="Horas sin requerimiento"
                  value={`${metrics.roleViews.pmView.kpis.hoursWithoutRequirement.toFixed(2)} h`}
                  helper="Tiempo no vinculado"
                  icon={AlertTriangle}
                  variant={metrics.roleViews.pmView.kpis.hoursWithoutRequirement > 0 ? "warning" : "default"}
                />
              </>
            ) : null}
            {isContributor ? (
              <>
                <KpiCard
                  label="Horas esta semana"
                  value={`${metrics.roleViews.contributorView.kpis.hoursThisWeek.toFixed(2)} h`}
                  helper="Últimos 7 días"
                  icon={CalendarClock}
                  variant="default"
                />
                <KpiCard
                  label="Horas en curso"
                  value={String(metrics.roleViews.contributorView.kpis.openTimeEntriesCount)}
                  helper="Cierra estas horas para consolidar tu reporte"
                  icon={Timer}
                  variant={metrics.roleViews.contributorView.kpis.openTimeEntriesCount > 0 ? "warning" : "default"}
                />
                <KpiCard
                  label="Requerimientos activos"
                  value={String(metrics.roleViews.contributorView.kpis.activeRequirements)}
                  helper="Pendientes asignados"
                  icon={CircleDot}
                  variant="info"
                />
                <KpiCard
                  label="Horas sin requerimiento"
                  value={`${metrics.roleViews.contributorView.kpis.hoursWithoutRequirement.toFixed(2)} h`}
                  helper="Tiempo que debes asociar a tickets"
                  icon={AlertTriangle}
                  variant={metrics.roleViews.contributorView.kpis.hoursWithoutRequirement > 0 ? "warning" : "default"}
                />
              </>
            ) : null}
          </div>
        </section>

        {!isContributor ? (
          <BillingEstimateByClientTable
            rows={metrics.billingEstimateByClient}
            referenceFootnote={formatFinancialReferenceRatesFootnote(referenceRates)}
          />
        ) : null}

        {(isAdminLike || isProjectManager) && utilizationData.length > 0 ? (
          <UtilizationPanel data={utilizationData} />
        ) : null}

        <section aria-labelledby="dash-charts-heading" className="surface-card space-y-5 p-[length:var(--density-inset-pad)]">
          <h2 id="dash-charts-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Análisis visual
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            {isContributor
              ? "Tendencia y distribución personal para priorizar tu carga y cerrar pendientes."
              : isProjectManager
                ? "Panel operativo del equipo: tendencia, carga por persona y estado de requerimientos."
                : "Vista ejecutiva con tendencia global, consumo por cliente y estado de cartera."}
          </p>
          {allChartsEmpty ? (
            <div className="surface-card flex items-start gap-3 border-dashed p-4">
              <div className="mt-0.5 rounded-[2px] border border-border bg-muted/60 p-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Panel sin datos para los filtros actuales</p>
                <p className="text-sm text-muted-foreground">
                  {isContributor
                    ? "Registra tu primera hora y clasifícala para activar tus indicadores personales."
                    : isProjectManager
                      ? "Registra horas y actualiza estados para activar el panel operativo por equipo."
                      : "Crea requerimientos y registra horas para activar la lectura ejecutiva de cartera."}
                </p>
                <div className="pt-1">
                  <Link href={isContributor ? "/time-entries/new" : "/requirements/new"} className="btn-secondary text-xs">
                    {isContributor ? "Registrar mi primera hora" : "Crear requerimiento"}
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-12">
            {(isAdminLike || isProjectManager) ? (
              <DashboardChartCard
                className="lg:col-span-12"
                title="Evolución de horas cargadas por mes"
                mode="lineArea"
                tall
                emptyHint="Registra horas para ver la evolución mensual."
                data={monthHours}
              />
            ) : null}
            {isContributor ? (
              <DashboardChartCard
                className="lg:col-span-7"
                title="Evolución personal de horas"
                mode="lineArea"
                tall
                emptyHint="Registra horas para visualizar tu tendencia semanal."
                data={monthHours}
              />
            ) : null}
            {isAdminLike ? (
              <DashboardChartCard
                className="lg:col-span-7"
                title="Horas por cliente"
                mode="barHorizontal"
                emptyHint="Registra horas asociadas a requerimientos para mostrar clientes con consumo."
                data={byClientHours}
              />
            ) : null}
            {isProjectManager ? (
              <DashboardChartCard
                className="lg:col-span-7"
                title="Carga por persona"
                mode="barHorizontal"
                emptyHint="Las horas por persona aparecerán cuando existan registros."
                data={byPersonHours}
              />
            ) : null}
            <DashboardChartCard
              className="lg:col-span-5"
              title={isContributor ? "Horas por categoría" : "Requerimientos por estado"}
              mode="pie"
              emptyHint={
                isContributor
                  ? "Categoriza tus horas para ver en qué inviertes más tiempo."
                  : "Cuando existan requerimientos, aquí se mostrará la proporción por estado."
              }
              data={isContributor ? categoryHoursChartData : statusChartData}
            />
            {isContributor ? (
              <DashboardChartCard
                className="lg:col-span-12"
                title="Requerimientos por prioridad"
                mode="barHorizontal"
                emptyHint="Actualiza o crea requerimientos para visualizar prioridades activas."
                data={priorityChartData}
              />
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
