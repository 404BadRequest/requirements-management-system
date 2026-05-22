import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { SpendReportTable } from "@/app/reports/spend-report-table";
import { UtilizationPanel, type UtilizationData } from "@/components/reports/utilization-panel";
import Link from "next/link";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getFinancialReferenceRates,
  getProfiles,
  getRequirements,
  getTimeEntries,
  getUsers,
} from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { buildSpendReport, summarizeSpendReport } from "@/lib/reports/spend-report";
import { formatFinancialReferenceRatesFootnote } from "@/lib/formatting/reference-rates-footnote";

function defaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; from?: string; to?: string }>;
}) {
  const sessionUser = await requirePermission("reports.read");
  const ownScope = false;
  const sp = await searchParams;
  const defaults = defaultDateRange();
  let from = sp.from?.trim() || defaults.from;
  let to = sp.to?.trim() || defaults.to;
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }
  const clientId = sp.clientId?.trim() ?? "";

  const [entries, requirements, users, clients, profiles, categories, referenceRates, contracts] = await Promise.all([
    getTimeEntries(),
    getRequirements(),
    getUsers(),
    getClients(),
    getProfiles(),
    getCatalogByKind("time_entry_category"),
    getFinancialReferenceRates(),
    getContractBudgets(),
  ]);

  const categoryLabelByCode = new Map(categories.filter((c) => c.active).map((c) => [c.code, c.label]));
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(sessionUser, users);
  const scopedRequirements = ownScope ? requirements.filter((requirement) => requirement.ownerId === currentDirectoryUserId) : requirements;
  const scopedEntries = ownScope ? entries.filter((entry) => entry.userId === currentDirectoryUserId) : entries;
  const scopedClientIds = new Set(scopedRequirements.map((requirement) => requirement.clientId));
  const activeClients = clients.filter((c) => c.active && (!ownScope || scopedClientIds.has(c.id)));
  const selectedClientId = activeClients.some((c) => c.id === clientId) ? clientId : "";
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const timeEntriesHref = (() => {
    const q = new URLSearchParams();
    if (selectedClientId) q.set("clientId", selectedClientId);
    const qs = q.toString();
    return qs ? `/time-entries?${qs}` : "/time-entries";
  })();
  const hasActiveFilters = selectedClientId !== "";
  const canExport = roleHasPermission(sessionUser.role, "reports.read");
  const exportHref = (() => {
    const q = new URLSearchParams({ from, to });
    if (selectedClientId) q.set("clientId", selectedClientId);
    return `/api/export/reports?${q.toString()}`;
  })();
  const activeFilterChips = [
    selectedClientId ? `Cliente: ${clientNameById.get(selectedClientId) ?? selectedClientId}` : "",
    `Periodo: ${from} → ${to}`,
  ].filter(Boolean);

  const rows = buildSpendReport({
    entries: scopedEntries,
    requirements: scopedRequirements,
    users,
    profiles,
    clients,
    contracts,
    categoryLabelByCode,
    fromDate: from,
    toDate: to,
    clientIdFilter: selectedClientId,
    projectIdFilter: "",
    referenceRates,
  });

  const { totalHours, totalClpDisplay, hasExcludedFromClpTotal, totalRevenueClpDisplay, globalMarginPercentageDisplay } = summarizeSpendReport(rows);

  // Utilization per person in the selected period
  const periodMs = Math.max(1, new Date(to).getTime() - new Date(from).getTime() + 86400000);
  const periodWeeks = periodMs / (7 * 24 * 3600 * 1000);
  const periodCapacityHours = Math.round(periodWeeks * referenceRates.weeklyCapacityHours);
  const profileNameById = new Map(profiles.map((p) => [p.id, p.name]));
  const requirementMap = new Map(requirements.map((r) => [r.id, r]));
  const minutesByUser = new Map<string, number>();
  for (const entry of scopedEntries) {
    if (entry.date < from || entry.date > to) continue;
    if (selectedClientId) {
      const req = entry.requirementId ? requirementMap.get(entry.requirementId) : undefined;
      const clientId = req?.clientId ?? entry.clientId;
      if (clientId !== selectedClientId) continue;
    }
    minutesByUser.set(entry.userId, (minutesByUser.get(entry.userId) ?? 0) + entry.durationMinutes);
  }
  const utilizationData: UtilizationData[] = users
    .filter((u) => u.active && minutesByUser.has(u.id))
    .map((u) => ({
      userId: u.id,
      userName: u.name,
      role: profileNameById.get(u.profileId) ?? u.role,
      loggedHours: (minutesByUser.get(u.id) ?? 0) / 60,
      capacityHours: periodCapacityHours,
    }))
    .sort((a, b) => b.loggedHours - a.loggedHours);

  return (
    <AppShell>
      <PageHeader
        title="Reportes"
        description="Horas registradas y costo por cliente, persona y categoría. Los importes en UF o USD se convierten a CLP con las tasas definidas en Configuración → UF y dólar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={timeEntriesHref} className="btn-secondary py-2 text-sm no-underline">
              Ver horas filtradas
            </Link>
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
            {hasActiveFilters ? (
              <Link href="/reports" className="btn-secondary py-2 text-sm no-underline">
                Limpiar filtros
              </Link>
            ) : null}
          </div>
        }
      />
      <form
        className="surface-card mb-4 flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)]"
        action="/reports"
        method="get"
      >
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="report-client" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </label>
          <select id="report-client" name="clientId" defaultValue={selectedClientId} className="field-control w-full max-w-md">
            <option value="">Todos los clientes</option>
            {activeClients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[10rem] flex-col gap-2">
          <label htmlFor="report-from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Desde
          </label>
          <input id="report-from" type="date" name="from" defaultValue={from} className="field-control w-full" required />
        </div>
        <div className="flex min-w-[10rem] flex-col gap-2">
          <label htmlFor="report-to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hasta
          </label>
          <input id="report-to" type="date" name="to" defaultValue={to} className="field-control w-full" required />
        </div>
        <button type="submit" className="btn-primary">
          Actualizar reporte
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {activeFilterChips.map((chip) => (
          <span key={chip} className="rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground">
            {chip}
          </span>
        ))}
      </div>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas totales</p>
          <p className="text-2xl font-semibold tabular-nums">{totalHours.toFixed(2)} h</p>
        </article>
        <article className="surface-card border-primary/20 bg-primary/[0.06] p-4">
          <p className="text-xs text-muted-foreground">Costo Total (CLP)</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{totalClpDisplay}</p>
          {hasExcludedFromClpTotal ? (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Excluye líneas sin conversión.
            </p>
          ) : null}
        </article>
        <article className="surface-card border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Venta Estimada (CLP)</p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{totalRevenueClpDisplay}</p>
        </article>
        <article className="surface-card border-amber-500/20 bg-amber-500/[0.06] p-4">
          <p className="text-xs text-amber-700 dark:text-amber-400">Margen Bruto</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
              {globalMarginPercentageDisplay}
            </p>
          </div>
        </article>
      </section>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{formatFinancialReferenceRatesFootnote(referenceRates)}</p>

      <SpendReportTable rows={rows} />

      {utilizationData.length > 0 ? (
        <UtilizationPanel data={utilizationData} weeklyCapacityHours={referenceRates.weeklyCapacityHours} />
      ) : null}
    </AppShell>
  );
}
