import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import { getCatalogByKind, getClients, getOperationalTimeEntries, getRequirements, getUsers } from "@/data/repositories/server-db";

const MAX_RESULTS_PER_SECTION = 8;

export async function GET(request: NextRequest) {
  const { user } = await getAppSession();
  const canSearchRequirements = Boolean(user?.role && roleHasPermission(user.role, "requirements.read"));
  const canSearchTimeEntries = Boolean(user?.role && roleHasPermission(user.role, "time_entries.read"));

  if (!user || (!canSearchRequirements && !canSearchTimeEntries)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ requirements: [], timeEntries: [] });
  }

  const normalizedQuery = q.toLowerCase();
  const [requirements, allTimeEntries, users, clients, requirementStatuses] = await Promise.all([
    canSearchRequirements ? getRequirements() : Promise.resolve([]),
    canSearchTimeEntries ? getOperationalTimeEntries() : Promise.resolve([]),
    getUsers(),
    getClients(),
    getCatalogByKind("requirement_status"),
  ]);

  const resolvedUserId = resolveDirectoryUserIdForSession(user, users);
  const ownScope = user.role === "Contributor";
  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));
  const userNameById = new Map(users.map((item) => [item.id, item.name]));
  const statusLabelByCode = new Map(
    requirementStatuses.filter((item) => item.active).map((item) => [item.code, formatStatusLabel(item.code, item.label)]),
  );

  const requirementResults = requirements
    .filter((item) => (ownScope ? item.ownerId === resolvedUserId : true))
    .map((item) => ({
      id: item.id,
      title: item.title,
      clientName: clientNameById.get(item.clientId) ?? item.clientId,
      statusLabel: statusLabelByCode.get(item.status) ?? item.status,
      href: `/requirements/id/${item.id}`,
      searchBlob: `${item.id} ${item.title} ${item.status} ${clientNameById.get(item.clientId) ?? ""}`.toLowerCase(),
    }))
    .filter((item) => item.searchBlob.includes(normalizedQuery))
    .slice(0, MAX_RESULTS_PER_SECTION)
    .map(({ searchBlob: _searchBlob, ...item }) => item);

  const timeEntryResults = allTimeEntries
    .filter((item) => (ownScope ? item.userId === resolvedUserId : true))
    .map((item) => ({
      id: item.id,
      personName: userNameById.get(item.userId) ?? item.userId,
      date: item.date,
      timeRange: item.endTime ? `${item.startTime}–${item.endTime}` : `${item.startTime}–Pendiente`,
      taskDescription: item.taskDescription,
      statusLabel: item.endTime ? "Cerrado" : "En curso",
      href: `/time-entries/${item.id}`,
      searchBlob: `${item.id} ${item.taskDescription} ${item.date} ${userNameById.get(item.userId) ?? ""} ${item.endTime ? "cerrado" : "en curso"}`.toLowerCase(),
    }))
    .filter((item) => item.searchBlob.includes(normalizedQuery))
    .slice(0, MAX_RESULTS_PER_SECTION)
    .map(({ searchBlob: _searchBlob, ...item }) => item);

  return NextResponse.json({
    requirements: requirementResults,
    timeEntries: timeEntryResults,
  });
}
