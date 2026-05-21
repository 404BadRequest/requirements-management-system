import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { RequirementKanbanBoard } from "@/components/requirements/requirement-kanban-board";
import { getCatalogByKind, getClients, getRequirements, getUsers } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function RequirementsKanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requirePermission("requirements.read");
  const canManageStatus = roleHasPermission(user.role, "requirements.write");
  const { clientId = "" } = await searchParams;
  const clientIdTrim = clientId.trim();

  const [requirements, statusRows, clients, users] = await Promise.all([
    getRequirements(),
    getCatalogByKind("requirement_status"),
    getClients(),
    getUsers(),
  ]);
  const ownScope = user.role === "Contributor";
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(user, users);
  const visibleRequirements = ownScope ? requirements.filter((item) => item.ownerId === currentDirectoryUserId) : requirements;

  const filteredRequirements = clientIdTrim
    ? visibleRequirements.filter((item) => item.clientId === clientIdTrim)
    : visibleRequirements;
  const activeClients = clients.filter((c) => c.active);
  const tableHref =
    clientIdTrim !== ""
      ? `/requirements?clientId=${encodeURIComponent(clientIdTrim)}`
      : "/requirements";

  const statusColumns = statusRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ code: row.code, label: formatStatusLabel(row.code, row.label) }));

  return (
    <AppShell>
      <PageHeader
        title="Kanban de requerimientos"
        description="Vista por estado para seguimiento rápido de avance."
        actions={
          <a href={tableHref} className="btn-secondary py-2 text-sm no-underline">
            Ver tabla
          </a>
        }
      />
      <form
        className="surface-card mb-4 flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)]"
        action="/requirements/kanban"
        method="get"
      >
        <div className="flex min-w-[12rem] flex-col gap-2">
          <label htmlFor="kanban-client" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </label>
          <select id="kanban-client" name="clientId" defaultValue={clientId} className="field-control w-full max-w-md">
            <option value="">Todos los clientes</option>
            {activeClients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Aplicar filtro
        </button>
      </form>
      <RequirementKanbanBoard
        requirements={filteredRequirements}
        statusColumns={statusColumns}
        canManageStatus={canManageStatus}
        ownerOptions={users.filter((entry) => entry.active).map((entry) => ({ id: entry.id, name: entry.name }))}
      />
    </AppShell>
  );
}
