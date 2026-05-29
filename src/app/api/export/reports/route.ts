import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
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
} from "@/lib/reports/contract-valuation-report";
import { defaultReportDateRange, normalizeReportDateRange } from "@/lib/reports/report-filters";
import { buildReportsWorkbookBuffer } from "@/lib/reports/report-workbook";
import { buildSpendReport } from "@/lib/reports/spend-report";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "reports.read");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const defaults = defaultReportDateRange();
  const sp = req.nextUrl.searchParams;
  let from = sp.get("from")?.trim() || defaults.from;
  let to = sp.get("to")?.trim() || defaults.to;
  ({ from, to } = normalizeReportDateRange(from, to));
  const clientId = sp.get("clientId")?.trim() ?? "";
  const projectId = sp.get("projectId")?.trim() ?? "";
  const format = sp.get("format")?.trim().toLowerCase() || "xlsx";

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
  const ownScope = false;
  const currentDirectoryUserId = user ? resolveDirectoryUserIdForSession(user, users) : "";
  const scopedRequirements = ownScope
    ? requirements.filter((r) => r.ownerId === currentDirectoryUserId)
    : requirements;
  const scopedEntries = ownScope ? entries.filter((e) => e.userId === currentDirectoryUserId) : entries;

  const filters = { from, to, clientId, projectId };
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
    clientIdFilter: clientId,
    projectIdFilter: projectId,
    referenceRates,
  });

  const canViewValuation = user?.role === "Admin" || user?.role === "Project Manager";
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

  const clientLabel = clientId ? (clients.find((c) => c.id === clientId)?.name ?? clientId) : "Todos";
  const projectLabel = projectId ? (projects.find((p) => p.id === projectId)?.name ?? projectId) : "Todos";

  if (format === "csv") {
    const header = [
      "clientName",
      "contractName",
      "userName",
      "categoryCode",
      "categoryLabel",
      "hours",
      "billable",
      "amount",
      "currency",
      "amountDisplay",
      "amountClp",
      "revenueClp",
      "marginClp",
      "marginPercentage",
    ];

    const lines = [
      header.join(","),
      ...spendRows.map((row) =>
        [
          row.clientName,
          row.contractName,
          row.userName,
          row.categoryCode,
          row.categoryLabel,
          String(row.hours),
          String(row.billable),
          row.amount !== null ? String(row.amount) : "",
          row.currency,
          row.amountDisplay,
          row.amountClp !== null ? String(row.amountClp) : "",
          row.revenueClp !== null ? String(row.revenueClp) : "",
          row.marginClp !== null ? String(row.marginClp) : "",
          row.marginPercentage !== null ? String(row.marginPercentage) : "",
        ]
          .map((cell) => csvEscape(cell))
          .join(","),
      ),
    ];

    const filename = `reportes-${from}-${to}.csv`;
    const body = `\uFEFF${lines.join("\n")}`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const buffer = buildReportsWorkbookBuffer({
    filters: { from, to, clientLabel, projectLabel },
    summary,
    byProfile,
    byUser,
    byProject,
    contractValuation,
    projectValuation,
    spendRows,
    includeValuation: canViewValuation,
  });

  const filename = `reportes-${from}-${to}.xlsx`;
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
