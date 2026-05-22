import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { TimeEntriesTable } from "@/components/time-entries/time-entries-table";
import { TimeEntriesNewModal } from "@/components/time-entries/time-entries-new-modal";
import { PersonalUtilizationBanner } from "@/components/time-entries/personal-utilization-banner";
import { WEEKLY_CAPACITY_HOURS } from "@/lib/config/capacity";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getContractProfileAllocations,
  getProfiles,
  getRequirements,
  getTimeEntries,
  getUsers,
} from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";
import { formatCatalogLabel } from "@/lib/formatting/catalog-label";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; contractId?: string; contractStatus?: string; nueva?: string; duplicateId?: string; from?: string; to?: string; requirementId?: string; userId?: string }>;
}) {
  const user = await requirePermission("time_entries.read");
  const canCreate = roleHasPermission(user.role, "time_entries.write");
  const canEditAnyEntry = user.role === "Admin" || user.role === "Project Manager";
  const canPickAnyOwner = canEditAnyEntry;
  const ownScope = user.role === "Contributor";
  const canExport = roleHasPermission(user.role, "exports.run");
  const { clientId = "", contractId = "", contractStatus = "", nueva, duplicateId = "", from = "", to = "", requirementId: requirementIdParam = "", userId: userIdParam = "" } = await searchParams;
  const selectedFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : "";
  const selectedTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : "";
  const openNewModal = canCreate && (nueva === "1" || nueva === "true");
  const prefillRequirementId = requirementIdParam && !duplicateId ? requirementIdParam : "";
  const prefillUserId = userIdParam && !duplicateId && canPickAnyOwner ? userIdParam : "";
  const [entries, users, requirements, clients, timeCategories, contracts, profiles, contractAllocations] = await Promise.all([
    getTimeEntries(),
    getUsers(),
    getRequirements(),
    getClients(),
    getCatalogByKind("time_entry_category"),
    getContractBudgets(),
    getProfiles(),
    getContractProfileAllocations(),
  ]);
  const categoryLabelByCode = new Map(
    timeCategories.filter((c) => c.active).map((c) => [c.code, formatCatalogLabel(c.code, c.label)]),
  );
  const profileLabelById = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const validContractProfileKeys = new Set(contractAllocations.map((allocation) => `${allocation.contractId}::${allocation.profileId}`));

  const resolveContractStatus = (entry: (typeof entries)[number]) => {
    if (!entry.contractId) return "Sin contrato";
    if (!entry.contractProfileId) return "Sin asignación contractual";
    const isProfileQuoted = validContractProfileKeys.has(`${entry.contractId}::${entry.contractProfileId}`);
    if (!isProfileQuoted) return "Perfil no cotizado en contrato";
    return profileLabelById.get(entry.contractProfileId) ?? entry.contractProfileId;
  };

  const userMap = new Map(users.map((user) => [user.id, user.name]));
  const requirementMap = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(user, users);
  const ownClientIds = ownScope
    ? new Set(
        entries
          .filter((entry) => entry.userId === currentDirectoryUserId)
          .map((entry) => (entry.requirementId ? requirementMap.get(entry.requirementId)?.clientId : null))
          .filter((value): value is string => Boolean(value)),
      )
    : null;
  const ownContractIds = ownScope
    ? new Set(
        entries
          .filter((entry) => entry.userId === currentDirectoryUserId)
          .map((entry) => entry.contractId)
          .filter((value): value is string => Boolean(value)),
      )
    : null;
  const activeClients = clients.filter((c) => c.active && (!ownClientIds || ownClientIds.has(c.id)));
  const activeContracts = contracts.filter((contract) => contract.active && (!ownContractIds || ownContractIds.has(contract.id)));
  const selectedClientId = activeClients.some((c) => c.id === clientId) ? clientId : "";
  const selectedContractId = activeContracts.some((c) => c.id === contractId) ? contractId : "";
  const selectedContractStatus = contractStatus === "unassigned" ? "unassigned" : "";
  const sourceForDuplicate = duplicateId ? entries.find((entry) => entry.id === duplicateId) : undefined;
  const duplicateDefaultValues = (() => {
    if (!sourceForDuplicate) return undefined;
    const [endHour, endMinute] = (sourceForDuplicate.endTime ?? sourceForDuplicate.startTime).split(":").map((value) => Number(value));
    const endTotalMinutes = (Number.isFinite(endHour) ? endHour : 0) * 60 + (Number.isFinite(endMinute) ? endMinute : 0);
    const startSuggestedMinutes = Math.min(23 * 60 + 59, endTotalMinutes + 30);
    const endSuggestedMinutes = Math.min(23 * 60 + 59, startSuggestedMinutes + 60);
    const asTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return {
      projectId: sourceForDuplicate.projectId,
      requirementId: sourceForDuplicate.requirementId,
      contractId: sourceForDuplicate.contractId,
      contractProfileId: sourceForDuplicate.contractProfileId,
      category: sourceForDuplicate.category,
      taskDescription: sourceForDuplicate.taskDescription,
      observations: sourceForDuplicate.observations,
      userId: sourceForDuplicate.userId,
      date: sourceForDuplicate.date,
      startTime: asTime(startSuggestedMinutes),
      endTime: asTime(endSuggestedMinutes),
    };
  })();

  const selectedUserId = canPickAnyOwner && users.some((u) => u.id === userIdParam) ? userIdParam : "";
  const filteredEntries = entries.filter((entry) => {
    if (ownScope && entry.userId !== currentDirectoryUserId) return false;
    if (selectedUserId && entry.userId !== selectedUserId) return false;
    if (selectedClientId) {
      const requirement = entry.requirementId ? requirementMap.get(entry.requirementId) : undefined;
      const entryClientId = requirement?.clientId ?? entry.clientId;
      if (entryClientId !== selectedClientId) return false;
    }
    if (selectedContractId && entry.contractId !== selectedContractId) {
      return false;
    }
    if (selectedContractStatus === "unassigned") {
      if (!entry.contractId) return false;
      if (!entry.contractProfileId) return true;
      const isProfileQuoted = validContractProfileKeys.has(`${entry.contractId}::${entry.contractProfileId}`);
      if (isProfileQuoted) return false;
    }
    if (selectedFrom && entry.date < selectedFrom) return false;
    if (selectedTo && entry.date > selectedTo) return false;
    return true;
  });

  const exportHref = (() => {
    const q = new URLSearchParams();
    if (selectedClientId) q.set("clientId", selectedClientId);
    if (selectedContractId) q.set("contractId", selectedContractId);
    if (selectedContractStatus) q.set("contractStatus", selectedContractStatus);
    if (selectedFrom) q.set("from", selectedFrom);
    if (selectedTo) q.set("to", selectedTo);
    const s = q.toString();
    return s ? `/api/export/time-entries?${s}` : "/api/export/time-entries";
  })();

  // Utilización personal de la semana actual (no aplica para Admin)
  const showUtilization = user.role !== "Admin";
  const personalUtilization = (() => {
    if (!showUtilization) return null;
    const now = new Date();
    // Lunes de la semana actual
    const day = now.getDay(); // 0=Dom, 1=Lun...
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const weekFrom = monday.toISOString().slice(0, 10);
    const weekTo = sunday.toISOString().slice(0, 10);
    const weekEntries = entries.filter(
      (e) => e.userId === currentDirectoryUserId && e.date >= weekFrom && e.date <= weekTo,
    );
    const loggedMinutes = weekEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
    const loggedHours = loggedMinutes / 60;
    const directoryUser = users.find((u) => u.id === currentDirectoryUserId);
    const userName = directoryUser?.name ?? user.name ?? "—";
    const profileName = directoryUser
      ? (profiles.find((p) => p.id === directoryUser.profileId)?.name ?? null)
      : null;
    const formatWeek = (d: Date) =>
      d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
    return {
      userName,
      role: profileName ?? user.role,
      loggedHours,
      capacityHours: WEEKLY_CAPACITY_HOURS,
      weekLabel: `${formatWeek(monday)} – ${formatWeek(sunday)}`,
    };
  })();

  const clientCell = (requirementId: string | null) => {
    if (!requirementId) return "Sin requerimiento";
    const requirement = requirementMap.get(requirementId);
    if (!requirement) return "—";
    const c = clientMap.get(requirement.clientId);
    return c?.name ?? requirement.clientId;
  };

  return (
    <AppShell>
      <PageHeader
        title="Registro de horas"
        description="Horas por persona, categoría y requerimiento"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
            <TimeEntriesNewModal
              autoOpen={openNewModal}
              defaultValues={duplicateDefaultValues ?? (prefillRequirementId || prefillUserId ? { requirementId: prefillRequirementId || null, userId: prefillUserId || undefined } : undefined)}
            />
          ) : null}
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
          </div>
        }
      />
      {personalUtilization ? (
        <PersonalUtilizationBanner
          userName={personalUtilization.userName}
          role={personalUtilization.role}
          loggedHours={personalUtilization.loggedHours}
          capacityHours={personalUtilization.capacityHours}
          weekLabel={personalUtilization.weekLabel}
        />
      ) : null}
      <form
        className="surface-card mb-4 flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)]"
        action="/time-entries"
        method="get"
      >
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="client-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filtrar por cliente
          </label>
          <select id="client-filter" name="clientId" defaultValue={selectedClientId} className="field-control w-full max-w-md">
            <option value="">Todos los clientes</option>
            {activeClients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="contract-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filtrar por contrato
          </label>
          <select id="contract-filter" name="contractId" defaultValue={selectedContractId} className="field-control w-full max-w-md">
            <option value="">Todos los contratos</option>
            {activeContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.code} · {contract.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="contract-status-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estado contractual
          </label>
          <select
            id="contract-status-filter"
            name="contractStatus"
            defaultValue={selectedContractStatus}
            className="field-control w-full max-w-md"
          >
            <option value="">Todos</option>
            <option value="unassigned">Sin asignación contractual</option>
          </select>
        </div>
        <div className="flex min-w-[10rem] flex-col gap-2">
          <label htmlFor="from-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Desde
          </label>
          <input
            id="from-filter"
            type="date"
            name="from"
            defaultValue={selectedFrom}
            className="field-control"
          />
        </div>
        <div className="flex min-w-[10rem] flex-col gap-2">
          <label htmlFor="to-filter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hasta
          </label>
          <input
            id="to-filter"
            type="date"
            name="to"
            defaultValue={selectedTo}
            className="field-control"
          />
        </div>
        <button type="submit" className="btn-primary">
          Aplicar filtro
        </button>
      </form>
      {filteredEntries.length === 0 && !selectedClientId && !selectedContractId && !selectedContractStatus ? (
        <div className="surface-card p-4 sm:p-5">
          <div
            className="rounded-[2px] border border-dashed border-border bg-muted/25 px-6 py-12 text-center text-sm text-muted-foreground"
            role="status"
          >
            <p className="font-medium text-foreground">No hay horas registradas</p>
            <p className="mt-1">Aún no se han registrado horas en el sistema. Comienza registrando tu trabajo.</p>
            {canCreate ? (
              <div className="mt-4 flex justify-center">
                <TimeEntriesNewModal
                  autoOpen={openNewModal}
                  defaultValues={duplicateDefaultValues ?? (prefillRequirementId || prefillUserId ? { requirementId: prefillRequirementId || null, userId: prefillUserId || undefined } : undefined)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <TimeEntriesTable
          users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
          clients={clients.filter((client) => client.active).map((client) => ({ id: client.id, name: client.name }))}
          requirements={requirements.map((r) => ({ id: r.id, title: r.title, clientId: r.clientId }))}
          contracts={contracts
            .filter((contract) => contract.active)
            .map((contract) => ({ id: contract.id, clientId: contract.clientId, label: `${contract.code} · ${contract.name}` }))}
          contractProfiles={profiles.map((profile) => ({ id: profile.id, label: profile.name }))}
          categories={timeCategories.filter((c) => c.active).map((c) => ({ code: c.code, label: c.label }))}
          canPickAnyOwner={canPickAnyOwner}
          rows={filteredEntries.map((entry) => ({
            id: entry.id,
            entry,
            date: entry.date,
            userName: userMap.get(entry.userId) ?? entry.userId,
            canEdit:
              canEditAnyEntry ||
              (entry.userId === currentDirectoryUserId &&
                (!entry.requirementId || requirementMap.get(entry.requirementId)?.ownerId === currentDirectoryUserId)),
            canDelete:
              canEditAnyEntry ||
              (entry.userId === currentDirectoryUserId &&
                (!entry.requirementId || requirementMap.get(entry.requirementId)?.ownerId === currentDirectoryUserId)),
            category: categoryLabelByCode.get(entry.category) ?? entry.category,
            durationMinutes: entry.durationMinutes,
            durationLabel: entry.endTime ? `${(entry.durationMinutes / 60).toFixed(2)} h` : "En curso",
            clientLabel: clientCell(entry.requirementId),
            contractStatus: resolveContractStatus(entry),
            openEndWarning: !entry.endTime,
          }))}
        />
      )}
    </AppShell>
  );
}
