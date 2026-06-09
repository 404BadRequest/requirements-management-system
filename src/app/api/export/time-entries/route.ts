import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import {
  getCatalogByKind,
  getContractProfileAllocations,
  getOperationalTimeEntries,
  getOperationalUsers,
  getRequirements,
} from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatCatalogLabel } from "@/lib/formatting/catalog-label";
import { buildTimeEntriesWorkbookBuffer, mapTimeEntriesForExport } from "@/lib/export/time-entries-workbook";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const clientId = req.nextUrl.searchParams.get("clientId")?.trim() ?? "";
  const contractId = req.nextUrl.searchParams.get("contractId")?.trim() ?? "";
  const contractStatus = req.nextUrl.searchParams.get("contractStatus")?.trim() ?? "";
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const from = req.nextUrl.searchParams.get("from")?.trim() ?? "";
  const to = req.nextUrl.searchParams.get("to")?.trim() ?? "";
  const userId = req.nextUrl.searchParams.get("userId")?.trim() ?? "";

  const [entries, users, requirements, categories, contractAllocations] = await Promise.all([
    getOperationalTimeEntries(),
    getOperationalUsers(),
    getRequirements(),
    getCatalogByKind("time_entry_category"),
    getContractProfileAllocations(),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const requirementMap = new Map(requirements.map((r) => [r.id, r]));
  const categoryLabelByCode = new Map(
    categories.filter((row) => row.active).map((row) => [row.code, formatCatalogLabel(row.code, row.label)]),
  );
  const allocationKeySet = new Set(contractAllocations.map((allocation) => `${allocation.contractId}::${allocation.profileId}`));
  const ownScope = user?.role === "Contributor";
  const currentDirectoryUserId = user ? resolveDirectoryUserIdForSession(user, users) : "";

  const filtered = entries.filter((entry) => {
    if (ownScope && entry.userId !== currentDirectoryUserId) return false;
    if (userId && entry.userId !== userId) return false;
    if (projectId && entry.projectId !== projectId) return false;
    if (contractId && entry.contractId !== contractId) return false;
    if (contractStatus === "unassigned") {
      if (!entry.contractId) return false;
      if (!entry.contractProfileId) return true;
      const isProfileQuoted = allocationKeySet.has(`${entry.contractId}::${entry.contractProfileId}`);
      if (isProfileQuoted) return false;
    }
    if (clientId) {
      const requirement = entry.requirementId ? requirementMap.get(entry.requirementId) : undefined;
      const entryClientId = requirement?.clientId ?? entry.clientId;
      if (entryClientId !== clientId) return false;
    }
    if (from && entry.date < from) return false;
    if (to && entry.date > to) return false;
    return true;
  });

  const exportRows = mapTimeEntriesForExport(filtered, {
    categoryLabelByCode,
    userNameById: userMap,
  });
  const buffer = buildTimeEntriesWorkbookBuffer(exportRows);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="horas-${today}.xlsx"`,
    },
  });
}
