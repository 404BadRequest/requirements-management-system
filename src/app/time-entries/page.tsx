import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { TimeEntriesTable } from "@/components/time-entries/time-entries-table";
import { TimeEntriesNewModal } from "@/components/time-entries/time-entries-new-modal";
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
  searchParams: Promise<{ clientId?: string; contractStatus?: string; nueva?: string }>;
}) {
  const user = await requirePermission("time_entries.read");
  const canCreate = roleHasPermission(user.role, "time_entries.write");
  const canEditAnyEntry = user.role === "Admin" || user.role === "Project Manager";
  const canPickAnyOwner = canEditAnyEntry;
  const ownScope = user.role === "Contributor";
  const canExport = roleHasPermission(user.role, "exports.run");
  const { clientId = "", contractStatus = "", nueva } = await searchParams;
  const openNewModal = canCreate && (nueva === "1" || nueva === "true");
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
  const activeClients = clients.filter((c) => c.active && (!ownClientIds || ownClientIds.has(c.id)));
  const selectedClientId = activeClients.some((c) => c.id === clientId) ? clientId : "";
  const selectedContractStatus = contractStatus === "unassigned" ? "unassigned" : "";

  const filteredEntries = entries.filter((entry) => {
    if (ownScope && entry.userId !== currentDirectoryUserId) return false;
    if (selectedClientId) {
      const requirement = entry.requirementId ? requirementMap.get(entry.requirementId) : undefined;
      if (requirement?.clientId !== selectedClientId) return false;
    }
    if (selectedContractStatus === "unassigned") {
      if (!entry.contractId) return false;
      if (!entry.contractProfileId) return true;
      const isProfileQuoted = validContractProfileKeys.has(`${entry.contractId}::${entry.contractProfileId}`);
      if (isProfileQuoted) return false;
    }
    return true;
  });

  const exportHref = (() => {
    const q = new URLSearchParams();
    if (selectedClientId) q.set("clientId", selectedClientId);
    if (selectedContractStatus) q.set("contractStatus", selectedContractStatus);
    const s = q.toString();
    return s ? `/api/export/time-entries?${s}` : "/api/export/time-entries";
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
            {canCreate ? <TimeEntriesNewModal autoOpen={openNewModal} /> : null}
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
          </div>
        }
      />
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
        <button type="submit" className="btn-primary">
          Aplicar filtro
        </button>
      </form>
      <TimeEntriesTable
        users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
        requirements={requirements.map((r) => ({ id: r.id, title: r.title }))}
        contracts={contracts.filter((contract) => contract.active).map((contract) => ({ id: contract.id, label: `${contract.code} · ${contract.name}` }))}
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
          durationLabel: `${(entry.durationMinutes / 60).toFixed(1)} h`,
          clientLabel: clientCell(entry.requirementId),
          contractStatus: resolveContractStatus(entry),
        }))}
      />
    </AppShell>
  );
}
