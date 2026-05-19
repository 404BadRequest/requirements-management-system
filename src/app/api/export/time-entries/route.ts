import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getClients, getContractBudgets, getContractProfileAllocations, getProfiles, getRequirements, getTimeEntries, getUsers } from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { csvEscape } from "@/lib/export/csv-escape";

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

  const [entries, users, requirements, clients, contracts, profiles, contractAllocations] = await Promise.all([
    getTimeEntries(),
    getUsers(),
    getRequirements(),
    getClients(),
    getContractBudgets(),
    getProfiles(),
    getContractProfileAllocations(),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const requirementMap = new Map(requirements.map((r) => [r.id, r]));
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const contractMap = new Map(contracts.map((contract) => [contract.id, contract]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const allocationKeySet = new Set(contractAllocations.map((allocation) => `${allocation.contractId}::${allocation.profileId}`));
  const ownScope = user?.role === "Contributor";
  const currentDirectoryUserId = user ? resolveDirectoryUserIdForSession(user, users) : "";

  const filtered = entries.filter((entry) => {
    if (ownScope && entry.userId !== currentDirectoryUserId) return false;
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
      if (requirement?.clientId !== clientId) return false;
    }
    return true;
  });

  const header = [
    "id",
    "projectId",
    "requirementId",
    "contractId",
    "contractCode",
    "contractName",
    "contractProfileId",
    "contractProfileName",
    "category",
    "taskDescription",
    "date",
    "startTime",
    "endTime",
    "durationMinutes",
    "userId",
    "userName",
    "clientLabel",
    "observations",
    "createdAt",
    "updatedAt",
  ];
  const lines = [
    header.join(","),
    ...filtered.map((e) => {
      const requirement = e.requirementId ? requirementMap.get(e.requirementId) : undefined;
      const clientLabel = requirement
        ? clientMap.get(requirement.clientId)?.name ?? requirement.clientId
        : "Sin requerimiento";
      return [
        e.id,
        e.projectId,
        e.requirementId ?? "",
        e.contractId ?? "",
        e.contractId ? (contractMap.get(e.contractId)?.code ?? "") : "",
        e.contractId ? (contractMap.get(e.contractId)?.name ?? "") : "",
        e.contractProfileId ?? "",
        e.contractProfileId ? (profileMap.get(e.contractProfileId) ?? e.contractProfileId) : "",
        e.category,
        e.taskDescription,
        e.date,
        e.startTime,
        e.endTime,
        String(e.durationMinutes),
        e.userId,
        userMap.get(e.userId) ?? e.userId,
        clientLabel,
        e.observations,
        e.createdAt,
        e.updatedAt,
      ]
        .map((cell) => csvEscape(String(cell)))
        .join(",");
    }),
  ];
  const body = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="time-entries.csv"',
    },
  });
}
