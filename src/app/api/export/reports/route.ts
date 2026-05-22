import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
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
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { buildSpendReport } from "@/lib/reports/spend-report";
import { csvEscape } from "@/lib/export/csv-escape";

function defaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "reports.read");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const defaults = defaultDateRange();
  const sp = req.nextUrl.searchParams;
  let from = sp.get("from")?.trim() || defaults.from;
  let to = sp.get("to")?.trim() || defaults.to;
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }
  const clientId = sp.get("clientId")?.trim() ?? "";

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
  const ownScope = false;
  const currentDirectoryUserId = user ? resolveDirectoryUserIdForSession(user, users) : "";
  const scopedRequirements = ownScope
    ? requirements.filter((r) => r.ownerId === currentDirectoryUserId)
    : requirements;
  const scopedEntries = ownScope
    ? entries.filter((e) => e.userId === currentDirectoryUserId)
    : entries;

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
    clientIdFilter: clientId,
    projectIdFilter: "",
    referenceRates,
  });

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
    ...rows.map((row) =>
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
