"use client";

import { Clock, ListTodo, PieChart, TrendingUp, Users, Wallet } from "lucide-react";
import { KpiCard } from "@/components/common/kpi-card";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import type { ClientPortalMetrics } from "@/lib/calculations/client-portal-metrics";
import { cn } from "@/lib/utils/cn";

function profileBarClass(usagePercent: number): string {
  if (usagePercent > 100) return "bg-danger";
  if (usagePercent > 85) return "bg-warning";
  return "bg-primary";
}

function profileTextClass(usagePercent: number): string {
  if (usagePercent > 100) return "text-danger";
  if (usagePercent > 85) return "text-warning";
  return "text-foreground";
}

export function ClientPortalInsights({ metrics }: { metrics: ClientPortalMetrics }) {
  const usedHours = (metrics.totalUsedMinutes / 60).toFixed(2);
  const quotedHours = (metrics.totalQuotedMinutes / 60).toFixed(2);
  const availableHours = Math.max(0, metrics.totalQuotedMinutes - metrics.totalUsedMinutes) / 60;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Presupuesto (UF)"
          value={`${metrics.budgetPercentage.toFixed(1)}%`}
          helper={`${metrics.consumedUf} de ${metrics.totalQuotedUf} UF consumidas`}
          icon={Wallet}
          variant={metrics.budgetPercentage > 90 ? "danger" : metrics.budgetPercentage > 75 ? "warning" : "default"}
        />
        <KpiCard
          label="Horas del contrato"
          value={`${metrics.hoursUsagePercent.toFixed(1)}%`}
          helper={`${usedHours} h registradas de ${quotedHours} h cotizadas`}
          icon={Clock}
          variant={metrics.hoursUsagePercent > 90 ? "danger" : metrics.hoursUsagePercent > 75 ? "warning" : "info"}
        />
        <KpiCard
          label="Horas disponibles"
          value={`${availableHours.toFixed(2)} h`}
          helper="Bolsa horaria aún no consumida"
          icon={TrendingUp}
          variant={availableHours <= 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Requerimientos activos"
          value={String(metrics.activeRequirements)}
          helper={`De ${metrics.totalRequirements} requerimientos en total`}
          icon={ListTodo}
        />
      </div>

      {metrics.profiles.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Horas por perfil
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metrics.profiles.map((profile) => {
              const barWidth = profile.quotedMinutes > 0 ? Math.min(profile.usagePercent, 100) : Math.min(profile.sharePercent, 100);
              return (
                <article key={profile.profileId} className="surface-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{profile.profileName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {profile.usedHours.toFixed(2)} h usadas
                        {profile.quotedHours > 0 ? ` · ${profile.quotedHours.toFixed(2)} h cotizadas` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-semibold tabular-nums", profileTextClass(profile.usagePercent))}>
                        {profile.quotedMinutes > 0 ? `${profile.usagePercent}%` : `${profile.sharePercent}%`}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {profile.quotedMinutes > 0 ? "Uso vs cotizado" : "Del total"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", profileBarClass(profile.usagePercent))}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>{profile.sharePercent}% del total registrado</span>
                    {profile.quotedMinutes > 0 ? (
                      <span>{Math.max(0, profile.quotedHours - profile.usedHours).toFixed(2)} h libres</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Visualización del avance
          </h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <DashboardChartCard
            title="Horas registradas por perfil"
            data={metrics.hoursByProfileChart}
            mode="barHorizontal"
            emptyHint="Aún no hay horas registradas en los contratos de este cliente."
          />
          <DashboardChartCard
            title="Participación de horas por perfil"
            data={metrics.hoursShareChart}
            mode="pie"
            emptyHint="Cuando se registren horas, verás la distribución por perfil."
          />
          <DashboardChartCard
            title="Requerimientos por estado"
            data={metrics.requirementsByStatusChart}
            mode="bar"
            barVariant="multiColor"
            emptyHint="No hay requerimientos para mostrar en el tablero."
          />
          <DashboardChartCard
            title="Horas por categoría"
            data={metrics.hoursByCategoryChart}
            mode="rose"
            emptyHint="Las horas aparecerán agrupadas por categoría de tiempo."
          />
        </div>
      </section>
    </div>
  );
}
