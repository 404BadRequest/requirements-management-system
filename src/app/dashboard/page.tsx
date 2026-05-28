import { BillingEstimateByClientTable } from "@/components/dashboard/billing-estimate-by-client";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { RiskBadge } from "@/components/common/badges";
import { AppShell } from "@/components/layout/app-shell";
import { UtilizationPanel, type UtilizationData } from "@/components/reports/utilization-panel";
import { ProjectHealthCards } from "@/components/dashboard/project-health-cards";
import Link from "next/link";
import {
  CircleDot,
  Clock,
  PieChart,
  AlertCircle,
  Users,
  AlertTriangle,
  Timer,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  Layers,
  Sun,
} from "lucide-react";
import {
  getCatalogByKind,
  getClients,
  getDashboardMetrics,
  getFinancialReferenceRates,
  getUsers,
} from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatFinancialReferenceRatesFootnote } from "@/lib/formatting/reference-rates-footnote";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import { catalogColorHex } from "@/lib/catalog-colors";
import type { SettingsCatalogEntry } from "@/types/domain";

// ── Helpers ────────────────────────────────────────────────────────────────

function catalogLabelByCode(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return entry?.label ?? code;
}

function mapRecordKeysToLabels(
  record: Record<string, number>,
  catalog: SettingsCatalogEntry[],
  formatter?: (code: string, label: string) => string,
): { name: string; value: number; color?: string }[] {
  return Object.entries(record).map(([code, value]) => {
    const entry = catalog.find((e) => e.active && e.code === code);
    const hex = catalogColorHex(entry?.color) ?? undefined;
    return {
      name: formatter ? formatter(code, entry?.label ?? code) : (entry?.label ?? code),
      value,
      ...(hex ? { color: hex } : {}),
    };
  });
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

const DAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

/** Genera los 7 días de la semana en curso (del más antiguo al más reciente). */
function buildWeekDayData(
  hoursByDayThisWeek: Record<string, number>,
): { name: string; value: number; isToday: boolean }[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = hoursByDayThisWeek[dateStr] ?? 0;
    return {
      name: DAY_LABELS[d.getDay()] ?? dateStr,
      value: Number((minutes / 60).toFixed(2)),
      isToday: dateStr === todayStr,
    };
  });
}

// ── Page ───────────────────────────────────────────────────────────────────

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

  const [clientList, referenceRates, requirementStatuses, requirementPriorities, timeEntryCategories, users] =
    await Promise.all([
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

  // ── Datos compartidos ───────────────────────────────────────────────────
  const statusChartData = mapRecordKeysToLabels(metrics.byStatus, requirementStatuses, formatStatusLabel);
  const priorityChartData = mapRecordKeysToLabels(metrics.byPriority, requirementPriorities);
  const categoryHoursChartData = Object.entries(metrics.hoursByCategory).map(([code, minutes]) => ({
    name: catalogLabelByCode(timeEntryCategories, code),
    value: Number((minutes / 60).toFixed(2)),
  }));
  const monthHours = sortedMonthHours(metrics.hoursByMonth);
  const byClientHours = recordToHoursChartData(metrics.hoursByClient);
  const byPersonHours = recordToHoursChartData(metrics.hoursByPerson);
  const reqsByOwnerData = recordToHoursChartData(metrics.reqsByOwner);
  const weekDayData = buildWeekDayData(metrics.hoursByDayThisWeek);

  // Utilización (Admin/PM)
  const utilizationData: UtilizationData[] = Object.entries(metrics.hoursByPerson).map(([name, minutes]) => {
    const user = users.find((u) => u.name === name);
    return {
      userId: user?.id ?? name,
      userName: name,
      role: user?.role ?? "Desconocido",
      loggedHours: minutes / 60,
      capacityHours: referenceRates.weeklyCapacityHours * 4,
    };
  });

  // Target diario de horas para Contributor (capacidad semanal / 5 días laborales)
  const dailyTargetHours = referenceRates.weeklyCapacityHours
    ? Math.round((referenceRates.weeklyCapacityHours / 5) * 10) / 10
    : undefined;

  return (
    <AppShell>
      <div className="space-y-4">

        {/* ─── Admin / Viewer ─────────────────────────────────────────────── */}
        {isAdminLike ? (
          <>
            <PageHeader
              title="Dashboard general"
              description="Visión ejecutiva de cartera: avance global, consumo y riesgo."
            />

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

            <section aria-labelledby="admin-kpis-heading" className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="admin-kpis-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Indicadores clave
                </h2>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  Riesgo operativo: <RiskBadge risk={metrics.risk} />
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              </div>
            </section>

            <BillingEstimateByClientTable
              rows={metrics.billingEstimateByClient}
              referenceFootnote={formatFinancialReferenceRatesFootnote(referenceRates)}
            />

            {utilizationData.length > 0 ? (
              <UtilizationPanel data={utilizationData} weeklyCapacityHours={referenceRates.weeklyCapacityHours} />
            ) : null}

            {metrics.projectHealthData?.length > 0 ? (
              <ProjectHealthCards data={metrics.projectHealthData} />
            ) : null}

            <section aria-labelledby="admin-charts-heading" className="surface-card space-y-5 p-[length:var(--density-inset-pad)]">
              <h2 id="admin-charts-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Análisis visual
              </h2>
              <div className="grid gap-6 lg:grid-cols-12">
                <DashboardChartCard
                  className="lg:col-span-12"
                  title="Evolución de horas cargadas por mes"
                  mode="lineArea"
                  tall
                  emptyHint="Registra horas para ver la evolución mensual."
                  data={monthHours}
                />
                <DashboardChartCard
                  className="lg:col-span-7"
                  title="Horas por cliente"
                  mode="barHorizontal"
                  emptyHint="Registra horas asociadas a requerimientos para mostrar clientes con consumo."
                  data={byClientHours}
                />
                <DashboardChartCard
                  className="lg:col-span-5"
                  title="Requerimientos por estado"
                  mode="pie"
                  emptyHint="Cuando existan requerimientos, aquí se mostrará la proporción por estado."
                  data={statusChartData}
                />
              </div>
            </section>
          </>
        ) : null}

        {/* ─── Project Manager ────────────────────────────────────────────── */}
        {isProjectManager ? (
          <>
            <PageHeader
              title="Dashboard de operación"
              description="Control operativo del equipo: velocidad de entrega, carga y alertas de ejecución."
            />

            <form
              className="surface-card flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)] sm:flex-nowrap sm:items-center"
              action="/dashboard"
              method="get"
            >
              <div className="flex min-w-[12rem] flex-1 flex-col gap-2">
                <label htmlFor="pm-client-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Filtrar por cliente
                </label>
                <select id="pm-client-filter" name="clientId" defaultValue={clientId} className="field-control w-full max-w-md">
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

            {/* Alertas inline PM */}
            {metrics.openTimeEntriesCount > 0 || metrics.hoursWithoutRequirement > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {metrics.openTimeEntriesCount > 0 ? (
                  <div className="flex items-center gap-2 rounded-[2px] border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">
                    <Timer className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{metrics.openTimeEntriesCount}</strong> registro{metrics.openTimeEntriesCount !== 1 ? "s" : ""} de horas sin cerrar
                    </span>
                  </div>
                ) : null}
                {metrics.hoursWithoutRequirement > 0 ? (
                  <div className="flex items-center gap-2 rounded-[2px] border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{metrics.hoursWithoutRequirement.toFixed(1)} h</strong> registradas sin requerimiento asociado
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* KPIs PM */}
            <section aria-labelledby="pm-kpis-heading" className="space-y-3">
              <h2 id="pm-kpis-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Indicadores clave
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  label="Requerimientos abiertos"
                  value={String(metrics.roleViews.pmView.kpis.openRequirements)}
                  icon={CircleDot}
                  variant="info"
                />
                <KpiCard
                  label="Finalizados (7 días)"
                  value={String(metrics.roleViews.pmView.kpis.completedLast7Days)}
                  helper="Throughput semanal"
                  icon={CheckCircle2}
                  variant={metrics.roleViews.pmView.kpis.completedLast7Days > 0 ? "success" : "default"}
                />
                <KpiCard
                  label="Completados este mes"
                  value={String(metrics.completedThisMonth)}
                  helper="Mes calendario actual"
                  icon={TrendingUp}
                  variant={metrics.completedThisMonth > 0 ? "success" : "default"}
                />
                <KpiCard
                  label="Ciclo promedio"
                  value={metrics.avgCycleTimeDays > 0 ? `${metrics.avgCycleTimeDays} días` : "—"}
                  helper="Días creación → entrega (últimos 30d)"
                  icon={Clock}
                  variant="info"
                />
                <KpiCard
                  label="Riesgo operativo"
                  value={metrics.risk === "sin presupuesto" ? "Sin presupuesto" : metrics.risk.charAt(0).toUpperCase() + metrics.risk.slice(1)}
                  helper="Estado del presupuesto global"
                  icon={AlertCircle}
                  variant={
                    metrics.risk === "rojo" ? "danger" : metrics.risk === "amarillo" ? "warning" : "default"
                  }
                />
              </div>
            </section>

            {/* Gráficas PM — fila 1 */}
            <div className="grid gap-6 lg:grid-cols-12">
              <DashboardChartCard
                className="lg:col-span-7"
                title="Evolución mensual de horas del equipo"
                mode="lineArea"
                tall
                emptyHint="Registra horas para ver la tendencia del equipo."
                data={monthHours}
              />
              <DashboardChartCard
                className="lg:col-span-5"
                title="Requerimientos por estado"
                mode="pie"
                emptyHint="Cuando existan requerimientos se mostrará la distribución por estado."
                data={statusChartData}
              />
            </div>

            {/* Gráficas PM — fila 2: distribución de carga */}
            <div className="grid gap-6 lg:grid-cols-12">
              <DashboardChartCard
                className="lg:col-span-6"
                title="Distribución de carga — reqs abiertos por persona"
                mode="barHorizontal"
                emptyHint="No hay requerimientos abiertos asignados."
                data={reqsByOwnerData}
              />
              <DashboardChartCard
                className="lg:col-span-6"
                title="Horas registradas por persona"
                mode="barHorizontal"
                emptyHint="No hay registros de horas disponibles."
                data={byPersonHours}
              />
            </div>

            {/* Utilización + Salud de proyectos */}
            {utilizationData.length > 0 ? (
              <UtilizationPanel data={utilizationData} weeklyCapacityHours={referenceRates.weeklyCapacityHours} />
            ) : null}
            {metrics.projectHealthData?.length > 0 ? (
              <ProjectHealthCards data={metrics.projectHealthData} />
            ) : null}
          </>
        ) : null}

        {/* ─── Contributor ────────────────────────────────────────────────── */}
        {isContributor ? (
          <>
            <PageHeader
              title="Mi dashboard"
              description="Tu actividad personal: horas, requerimientos y progreso semanal."
            />

            {/* Alerta horas hoy */}
            {metrics.loggedHoursToday === 0 ? (
              <div className="rounded-[2px] border border-warning/50 bg-warning/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Aún no has registrado horas hoy</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Registrar tus horas diariamente facilita tu reporte semanal y mantiene la visibilidad del proyecto.
                    </p>
                  </div>
                </div>
                <Link href="/time-entries/new" className="btn-primary whitespace-nowrap text-sm px-4 py-2">
                  Registrar horas
                </Link>
              </div>
            ) : null}

            {/* KPIs Contributor */}
            <section aria-labelledby="contributor-kpis-heading" className="space-y-3">
              <h2 id="contributor-kpis-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Mis indicadores
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Horas hoy"
                  value={`${metrics.loggedHoursToday.toFixed(2)} h`}
                  helper={metrics.loggedHoursToday === 0 ? "Sin registros aún" : "Registros de hoy"}
                  icon={Sun}
                  variant={metrics.loggedHoursToday === 0 ? "warning" : "success"}
                />
                <KpiCard
                  label="Horas esta semana"
                  value={`${metrics.roleViews.contributorView.kpis.hoursThisWeek.toFixed(2)} h`}
                  helper="Últimos 7 días"
                  icon={CalendarClock}
                  variant="default"
                />
                <KpiCard
                  label="Mis requerimientos activos"
                  value={String(metrics.roleViews.contributorView.kpis.activeRequirements)}
                  helper="Pendientes asignados a mí"
                  icon={Layers}
                  variant="info"
                />
                <KpiCard
                  label="Completados este mes"
                  value={String(metrics.completedThisMonth)}
                  helper="Mes calendario actual"
                  icon={CheckCircle2}
                  variant={metrics.completedThisMonth > 0 ? "success" : "default"}
                />
              </div>
            </section>

            {/* Gráficas Contributor — fila 1 */}
            <div className="grid gap-6 lg:grid-cols-12">
              <DashboardChartCard
                className="lg:col-span-7"
                title="Mi semana — horas por día"
                mode="weekBar"
                emptyHint="Registra horas esta semana para visualizar tu actividad diaria."
                data={weekDayData}
                weekBarTargetHours={dailyTargetHours}
              />
              <DashboardChartCard
                className="lg:col-span-5"
                title="Mis requerimientos por estado"
                mode="pie"
                emptyHint="Cuando tengas requerimientos asignados, aquí verás su distribución."
                data={statusChartData}
              />
            </div>

            {/* Gráficas Contributor — fila 2 */}
            <DashboardChartCard
              title="Mis horas por categoría"
              mode="barHorizontal"
              emptyHint="Categoriza tus horas para ver en qué inviertes más tiempo."
              data={categoryHoursChartData}
            />
          </>
        ) : null}

      </div>
    </AppShell>
  );
}
