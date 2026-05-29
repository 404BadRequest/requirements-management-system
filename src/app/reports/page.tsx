import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ReportsPageClient, type ReportsTab } from "@/app/reports/reports-page-client";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getFinancialReferenceRates,
  getProfiles,
  getProjects,
  getRequirements,
  getTimeEntries,
  getUsers,
} from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import {
  buildHoursByProfile,
  buildHoursByProject,
  buildHoursByUser,
  buildHoursReportSummary,
} from "@/lib/reports/hours-aggregations";
import {
  buildContractValuationReport,
  buildProjectValuationReport,
  summarizeValuationReport,
} from "@/lib/reports/contract-valuation-report";
import { defaultReportDateRange, normalizeReportDateRange } from "@/lib/reports/report-filters";
import { buildSpendReport } from "@/lib/reports/spend-report";
import { formatFinancialReferenceRatesFootnote } from "@/lib/formatting/reference-rates-footnote";
import {
  defaultTeamDateRange,
  lastMonthDateRange,
  thisWeekDateRange,
} from "@/lib/calculations/team-utilization";

const VALID_TABS: ReportsTab[] = ["resumen", "perfil", "persona", "proyecto", "valorizacion"];

function isReportsTab(value: string | undefined): value is ReportsTab {
  return VALID_TABS.includes(value as ReportsTab);
}

function buildReportsHref(params: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) q.set(key, value.trim());
  }
  const qs = q.toString();
  return qs ? `/reports?${qs}` : "/reports";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string; from?: string; to?: string; tab?: string }>;
}) {
  const sessionUser = await requirePermission("reports.read");
  const ownScope = false;
  const sp = await searchParams;
  const defaults = defaultReportDateRange();
  let from = sp.from?.trim() || defaults.from;
  let to = sp.to?.trim() || defaults.to;
  ({ from, to } = normalizeReportDateRange(from, to));
  const clientId = sp.clientId?.trim() ?? "";
  const projectId = sp.projectId?.trim() ?? "";
  const tabParam = sp.tab?.trim();
  const activeTab: ReportsTab = isReportsTab(tabParam) ? tabParam : "resumen";

  const canViewValuation = sessionUser.role === "Admin" || sessionUser.role === "Project Manager";
  const canExport = roleHasPermission(sessionUser.role, "reports.read");

  const [entries, requirements, users, clients, profiles, categories, referenceRates, contracts, projects] =
    await Promise.all([
      getTimeEntries(),
      getRequirements(),
      getUsers(),
      getClients(),
      getProfiles(),
      getCatalogByKind("time_entry_category"),
      getFinancialReferenceRates(),
      getContractBudgets(),
      getProjects(),
    ]);

  const categoryLabelByCode = new Map(categories.filter((c) => c.active).map((c) => [c.code, c.label]));
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(sessionUser, users);
  const scopedRequirements = ownScope
    ? requirements.filter((requirement) => requirement.ownerId === currentDirectoryUserId)
    : requirements;
  const scopedEntries = ownScope ? entries.filter((entry) => entry.userId === currentDirectoryUserId) : entries;
  const scopedClientIds = new Set(scopedRequirements.map((requirement) => requirement.clientId));
  const activeClients = clients.filter((c) => c.active && (!ownScope || scopedClientIds.has(c.id)));
  const activeProjects = projects.filter((p) => p.active);
  const selectedClientId = activeClients.some((c) => c.id === clientId) ? clientId : "";
  const selectedProjectId = activeProjects.some((p) => p.id === projectId) ? projectId : "";
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const filters = {
    from,
    to,
    clientId: selectedClientId,
    projectId: selectedProjectId,
  };

  const aggregationParams = {
    entries: scopedEntries,
    requirements: scopedRequirements,
    contracts,
    users,
    profiles,
    clients,
    projects,
    categoryLabelByCode,
    filters,
  };

  const summary = buildHoursReportSummary(aggregationParams);
  const byProfile = buildHoursByProfile(aggregationParams);
  const byUser = buildHoursByUser(aggregationParams);
  const byProject = buildHoursByProject(aggregationParams);

  const spendRows = buildSpendReport({
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
    projectIdFilter: selectedProjectId,
    referenceRates,
  });

  const valuationParams = {
    entries: scopedEntries,
    requirements: scopedRequirements,
    users,
    profiles,
    clients,
    projects,
    contracts,
    filters,
    referenceRates,
  };

  const contractValuation = canViewValuation ? buildContractValuationReport(valuationParams) : [];
  const projectValuation = canViewValuation ? buildProjectValuationReport(valuationParams) : [];
  const valuationKpis = canViewValuation ? summarizeValuationReport(contractValuation) : summarizeValuationReport([]);

  const ratesFootnote = formatFinancialReferenceRatesFootnote(referenceRates);

  const queryBase = (() => {
    const q = new URLSearchParams({ from, to, tab: activeTab });
    if (selectedClientId) q.set("clientId", selectedClientId);
    if (selectedProjectId) q.set("projectId", selectedProjectId);
    return q.toString();
  })();

  const timeEntriesHref = (() => {
    const q = new URLSearchParams();
    if (selectedClientId) q.set("clientId", selectedClientId);
    const qs = q.toString();
    return qs ? `/time-entries?${qs}` : "/time-entries";
  })();

  const exportHref = `/api/export/reports?${queryBase}&format=xlsx`;
  const hasActiveFilters = selectedClientId !== "" || selectedProjectId !== "";
  const presetParams = {
    clientId: selectedClientId,
    projectId: selectedProjectId,
    tab: activeTab,
  };
  const monthDefaults = defaultTeamDateRange();
  const thisWeek = thisWeekDateRange();
  const lastMonth = lastMonthDateRange();

  const activeFilterChips = [
    selectedClientId ? `Cliente: ${clientNameById.get(selectedClientId) ?? selectedClientId}` : "",
    selectedProjectId ? `Proyecto: ${projectNameById.get(selectedProjectId) ?? selectedProjectId}` : "",
    `Periodo: ${from} → ${to}`,
  ].filter(Boolean);

  return (
    <AppShell>
      <PageHeader
        title="Reportes"
        description="Analítica de horas por perfil, persona y proyecto. Admin y PM pueden valorizar costo, venta y margen por contrato."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={timeEntriesHref} className="btn-secondary py-2 text-sm no-underline">
              Ver horas filtradas
            </Link>
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar Excel
              </a>
            ) : null}
            {hasActiveFilters ? (
              <Link href={`/reports?tab=${activeTab}`} className="btn-secondary py-2 text-sm no-underline">
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
        <input type="hidden" name="tab" value={activeTab} />
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
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="report-project" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Proyecto
          </label>
          <select id="report-project" name="projectId" defaultValue={selectedProjectId} className="field-control w-full max-w-md">
            <option value="">Todos los proyectos</option>
            {activeProjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
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
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <span className="text-xs text-muted-foreground">Atajos:</span>
          <Link href={buildReportsHref({ ...presetParams, from: monthDefaults.from, to: monthDefaults.to })} className="btn-secondary py-1.5 text-xs no-underline">
            Este mes
          </Link>
          <Link href={buildReportsHref({ ...presetParams, from: thisWeek.from, to: thisWeek.to })} className="btn-secondary py-1.5 text-xs no-underline">
            Esta semana
          </Link>
          <Link href={buildReportsHref({ ...presetParams, from: lastMonth.from, to: lastMonth.to })} className="btn-secondary py-1.5 text-xs no-underline">
            Mes anterior
          </Link>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {activeFilterChips.map((chip) => (
          <span key={chip} className="rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground">
            {chip}
          </span>
        ))}
      </div>

      <ReportsPageClient
        activeTab={activeTab}
        queryBase={queryBase}
        canViewValuation={canViewValuation}
        summary={summary}
        byProfile={byProfile}
        byUser={byUser}
        byProject={byProject}
        valuationKpis={valuationKpis}
        contractValuation={contractValuation}
        projectValuation={projectValuation}
        spendRows={spendRows}
        ratesFootnote={ratesFootnote}
      />
    </AppShell>
  );
}
