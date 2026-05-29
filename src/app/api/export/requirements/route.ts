import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getContractBudgets, getOperationalUsers, getRequirements } from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const clientId = req.nextUrl.searchParams.get("clientId")?.trim() ?? "";
  const [all, users, contracts] = await Promise.all([getRequirements(), getOperationalUsers(), getContractBudgets()]);
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const ownScope = user?.role === "Contributor";
  const currentDirectoryUserId = user ? resolveDirectoryUserIdForSession(user, users) : "";
  const rows = all.filter((r) => {
    if (ownScope && r.ownerId !== currentDirectoryUserId) return false;
    if (projectId && r.projectId !== projectId) return false;
    if (clientId && r.clientId !== clientId) return false;
    return true;
  });
  const header = ["id", "projectId", "clientId", "contractId", "contractCode", "contractName", "title", "status", "priority", "ownerId", "createdAt"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.projectId,
        r.clientId,
        r.contractId ?? "",
        r.contractId ? (contractById.get(r.contractId)?.code ?? "") : "",
        r.contractId ? (contractById.get(r.contractId)?.name ?? "") : "",
        r.title,
        r.status,
        r.priority,
        r.ownerId,
        r.createdAt,
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
      "Content-Disposition": 'attachment; filename="requirements.csv"',
    },
  });
}
