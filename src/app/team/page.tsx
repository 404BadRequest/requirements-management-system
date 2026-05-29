import Link from "next/link";
import { AlertTriangle, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { UtilizationPanel } from "@/components/reports/utilization-panel";
import {
  getFinancialReferenceRates,
  getOperationalProfiles,
  getOperationalUsers,
  getRequirements,
  getTimeEntries,
} from "@/data/repositories/server-db";
import { filterOperationalTimeEntries } from "@/lib/profiles/operational-scope";
import { getAppSession } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/rsc-guard";
import {
  buildTeamUtilizationData,
  computeTeamSummaryKpis,
  defaultTeamDateRange,
  filterEntriesByDateRange,
  lastMonthDateRange,
  normalizeDateRange,
  periodCapacityHours,
  sumMinutesByUser,
  thisWeekDateRange,
} from "@/lib/calculations/team-utilization";
import { TeamDirectoryTable } from "@/app/team/team-directory-table";
import { buildTeamDirectoryRows, isValidRoleFilter } from "@/app/team/team-page-utils";
import type { Role } from "@/types/domain";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "Project Manager", label: "Project Manager" },
  { value: "Contributor", label: "Contributor" },
  { value: "Viewer", label: "Viewer" },
];

function buildTeamHref(params: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) q.set(key, value.trim());
  }
  const qs = q.toString();
  return qs ? `/team?${qs}` : "/team";
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; role?: string; profileId?: string; activeOnly?: string }>;
}) {
  await requirePermission("team.read");
  const { user } = await getAppSession();
  const canExport = user ? roleHasPermission(user.role, "exports.run") : false;
  const sp = await searchParams;
  const defaults = defaultTeamDateRange();
  let from = sp.from?.trim() || defaults.from;
  let to = sp.to?.trim() || defaults.to;
  ({ from, to } = normalizeDateRange(from, to));

  const roleFilter = sp.role?.trim() ?? "";
  const profileFilter = sp.profileId?.trim() ?? "";
  const activeOnly = sp.activeOnly !== "0";

  const [users, entries, requirements, profiles, referenceRates] = await Promise.all([
    getOperationalUsers(),
    getTimeEntries(),
    getRequirements(),
    getOperationalProfiles(),
    getFinancialReferenceRates(),
  ]);

  const operationalEntries = filterOperationalTimeEntries(entries, users, profiles);

  const filters = {
    from,
    to,
    role: isValidRoleFilter(roleFilter) ? roleFilter : undefined,
    profileId: profiles.some((profile) => profile.id === profileFilter) ? profileFilter : undefined,
    activeOnly,
  };

  const rows = buildTeamDirectoryRows(users, operationalEntries, requirements, profiles, filters, referenceRates.weeklyCapacityHours);
  const periodEntries = filterEntriesByDateRange(operationalEntries, from, to);
  const minutesByUser = sumMinutesByUser(periodEntries);
  const filteredUsers = users.filter((item) => {
    if (activeOnly && !item.active) return false;
    if (filters.role && item.role !== filters.role) return false;
    if (filters.profileId && item.profileId !== filters.profileId) return false;
    return true;
  });
  const periodCapacity = periodCapacityHours(from, to, referenceRates.weeklyCapacityHours);
  const utilizationData = buildTeamUtilizationData(
    filteredUsers,
    minutesByUser,
    profiles,
    periodCapacity,
    { activeOnly: false, includeZeroHours: true },
  );
  const kpis = computeTeamSummaryKpis(utilizationData, filteredUsers.filter((item) => item.active).length);

  const hasActiveFilters = Boolean(filters.role || filters.profileId || !activeOnly);
  const exportHref = (() => {
    const q = new URLSearchParams({ from, to });
    if (filters.role) q.set("role", filters.role);
    if (filters.profileId) q.set("profileId", filters.profileId);
    if (!activeOnly) q.set("activeOnly", "0");
    return `/api/export/team?${q.toString()}`;
  })();

  const presetParams = {
    role: filters.role ?? "",
    profileId: filters.profileId ?? "",
    activeOnly: activeOnly ? "1" : "0",
  };
  const thisWeek = thisWeekDateRange();
  const lastMonth = lastMonthDateRange();

  return (
    <AppShell>
      <PageHeader
        title="Equipo"
        description="Capacidad, carga y requerimientos abiertos por persona en el periodo seleccionado."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
            {hasActiveFilters ? (
              <Link href="/team" className="btn-secondary py-2 text-sm no-underline">
                Limpiar filtros
              </Link>
            ) : null}
          </div>
        }
      />

      <form
        className="surface-card mb-4 flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)]"
        action="/team"
        method="get"
      >
        <div className="flex min-w-[9rem] flex-col gap-2">
          <label htmlFor="team-from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Desde
          </label>
          <input id="team-from" name="from" type="date" defaultValue={from} className="field-control w-full" />
        </div>
        <div className="flex min-w-[9rem] flex-col gap-2">
          <label htmlFor="team-to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hasta
          </label>
          <input id="team-to" name="to" type="date" defaultValue={to} className="field-control w-full" />
        </div>
        <div className="flex min-w-[10rem] flex-col gap-2">
          <label htmlFor="team-role" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rol
          </label>
          <select id="team-role" name="role" defaultValue={filters.role ?? ""} className="field-control w-full">
            <option value="">Todos</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[10rem] flex-col gap-2">
          <label htmlFor="team-profile" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perfil
          </label>
          <select id="team-profile" name="profileId" defaultValue={filters.profileId ?? ""} className="field-control w-full">
            <option value="">Todos</option>
            {profiles
              .filter((profile) => profile.active)
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex min-w-[8rem] flex-col gap-2">
          <label htmlFor="team-active" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estado
          </label>
          <select id="team-active" name="activeOnly" defaultValue={activeOnly ? "1" : "0"} className="field-control w-full">
            <option value="1">Solo activos</option>
            <option value="0">Todos</option>
          </select>
        </div>
        <button type="submit" className="btn-primary py-2 text-sm">
          Aplicar
        </button>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <span className="text-xs text-muted-foreground">Atajos:</span>
          <Link href={buildTeamHref({ ...presetParams, from: defaults.from, to: defaults.to })} className="btn-secondary py-1.5 text-xs no-underline">
            Este mes
          </Link>
          <Link href={buildTeamHref({ ...presetParams, ...thisWeek })} className="btn-secondary py-1.5 text-xs no-underline">
            Esta semana
          </Link>
          <Link href={buildTeamHref({ ...presetParams, ...lastMonth })} className="btn-secondary py-1.5 text-xs no-underline">
            Mes anterior
          </Link>
        </div>
      </form>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Personas activas" value={String(kpis.activePeople)} icon={Users} variant="info" />
        <KpiCard
          label="Utilización media"
          value={`${kpis.averageUtilizationPercent}%`}
          helper={`Periodo ${from} → ${to}`}
          icon={TrendingUp}
          variant="default"
        />
        <KpiCard
          label="Sobrecargadas"
          value={String(kpis.overloadedCount)}
          helper="Utilización mayor al 100%"
          icon={AlertTriangle}
          variant="danger"
        />
        <KpiCard
          label="Subutilizadas"
          value={String(kpis.underutilizedCount)}
          helper="Utilización menor al 60%"
          icon={CheckCircle2}
          variant="warning"
        />
      </div>

      {utilizationData.length > 0 ? (
        <div className="mb-4">
          <UtilizationPanel data={utilizationData} weeklyCapacityHours={referenceRates.weeklyCapacityHours} />
        </div>
      ) : null}

      <div className="surface-card p-[length:var(--density-inset-pad)]">
        <TeamDirectoryTable rows={rows} from={from} to={to} />
      </div>
    </AppShell>
  );
}
