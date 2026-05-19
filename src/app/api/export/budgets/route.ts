import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getContractBudgets, getContractProfileAllocations } from "@/data/repositories/server-db";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const [contracts, allocations] = await Promise.all([getContractBudgets(), getContractProfileAllocations()]);
  const filteredContracts = projectId ? contracts.filter((contract) => contract.projectId === projectId) : contracts;
  const allowedContractIds = new Set(filteredContracts.map((contract) => contract.id));
  const filtered = allocations.filter((allocation) => allowedContractIds.has(allocation.contractId));
  const contractById = new Map(filteredContracts.map((contract) => [contract.id, contract]));

  const header = [
    "contractId",
    "contractCode",
    "contractName",
    "projectId",
    "clientId",
    "scope",
    "startDate",
    "endDate",
    "profileId",
    "quotedMinutes",
    "rateUfPerHour",
    "createdAt",
    "updatedAt",
  ];
  const lines = [
    header.join(","),
    ...filtered.map((r) =>
      [
        r.contractId,
        contractById.get(r.contractId)?.code ?? "",
        contractById.get(r.contractId)?.name ?? "",
        contractById.get(r.contractId)?.projectId ?? "",
        contractById.get(r.contractId)?.clientId ?? "",
        contractById.get(r.contractId)?.scope ?? "",
        contractById.get(r.contractId)?.startDate ?? "",
        contractById.get(r.contractId)?.endDate ?? "",
        r.profileId,
        String(r.quotedMinutes),
        String(r.rateUfPerHour ?? contractById.get(r.contractId)?.rateUfPerHour ?? ""),
        r.createdAt,
        r.updatedAt,
      ]
        .map((cell) => csvEscape(String(cell)))
        .join(","),
    ),
  ];
  const body = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="budgets.csv"',
    },
  });
}
