import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { WeeklyTimesheetClient } from "./weekly-timesheet-client";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getOperationalProfiles,
  getOperationalTimeEntries,
  getOperationalUsers,
  getRequirements,
} from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function WeeklyTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string; userId?: string }>;
}) {
  const user = await requirePermission("time_entries.read");
  const canEditAnyEntry = user.role === "Admin" || user.role === "Project Manager";
  const { weekStart, userId } = await searchParams;

  const [entries, users, requirements, clients, timeCategories, contracts, profiles] = await Promise.all([
    getOperationalTimeEntries(),
    getOperationalUsers(),
    getRequirements(),
    getClients(),
    getCatalogByKind("time_entry_category"),
    getContractBudgets(),
    getOperationalProfiles(),
  ]);

  const activeUsers = users.filter((u) => u.active);
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(user, activeUsers);
  
  // Determinar el usuario a mostrar
  let targetUserId = currentDirectoryUserId;
  if (canEditAnyEntry && userId && activeUsers.some(u => u.id === userId)) {
    targetUserId = userId;
  }

  // Filtrar entradas solo para el usuario objetivo
  const userEntries = entries.filter((e) => e.userId === targetUserId);

  return (
    <AppShell>
      <PageHeader
        title="Vista semanal"
        description="Bloques de tiempo de lunes a domingo — haz clic para registrar o editar"
      />
      <WeeklyTimesheetClient
        entries={userEntries}
        users={activeUsers.map((u) => ({ id: u.id, name: u.name }))}
        clients={clients.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))}
        requirements={requirements.map((r) => ({ id: r.id, title: r.title, clientId: r.clientId }))}
        contracts={contracts.filter((c) => c.active).map((c) => ({ id: c.id, clientId: c.clientId, label: `${c.code} · ${c.name}` }))}
        contractProfiles={profiles.map((p) => ({ id: p.id, label: p.name }))}
        categories={timeCategories.filter((c) => c.active).map((c) => ({ code: c.code, label: c.label }))}
        targetUserId={targetUserId}
        canPickAnyOwner={canEditAnyEntry}
        initialWeekStart={weekStart}
      />
    </AppShell>
  );
}
