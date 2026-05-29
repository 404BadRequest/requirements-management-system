import { notFound } from "next/navigation";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getContractProfileAllocations,
  getOperationalProfiles,
  getOperationalTimeEntries,
  getOperationalUsers,
  getRequirements,
} from "@/data/repositories/server-db";
import { RequirementKanbanBoard } from "@/components/requirements/requirement-kanban-board";
import { ClientPortalInsights } from "@/components/public/client-portal-insights";
import { buildClientPortalMetrics } from "@/lib/calculations/client-portal-metrics";
import { verifyPortalToken } from "@/lib/portal/token";

const TERMINAL_STATUSES = new Set(["DONE_PROD", "WONT_DO", "CLOSED"]);

export default async function PublicProjectPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const clientId = await verifyPortalToken(token);

  const [clients, requirements, contracts, allocations, timeEntries, statusRows, categories, profiles, users] =
    await Promise.all([
      getClients(),
      getRequirements(),
      getContractBudgets(),
      getContractProfileAllocations(),
      getOperationalTimeEntries(),
      getCatalogByKind("requirement_status"),
      getCatalogByKind("time_entry_category"),
      getOperationalProfiles(),
      getOperationalUsers(),
    ]);

  const client = clientId ? clients.find((item) => item.id === clientId) : null;
  if (!client) notFound();

  const clientRequirements = requirements.filter((requirement) => requirement.clientId === client.id);
  const statusColumns = statusRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ code: row.code, label: row.label }));

  const metrics = buildClientPortalMetrics({
    clientId: client.id,
    requirements,
    contracts,
    allocations,
    timeEntries,
    profiles,
    users,
    statuses: statusRows,
    categories,
    terminalStatuses: TERMINAL_STATUSES,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen del proyecto con avance de horas, perfiles y requerimientos en tiempo real.
        </p>
      </div>

      <ClientPortalInsights metrics={metrics} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Tablero de requerimientos</h2>
        <div className="rounded-[2px] border border-border bg-card p-[length:var(--density-inset-pad)] shadow-soft">
          <RequirementKanbanBoard
            requirements={clientRequirements}
            statusColumns={statusColumns}
            canManageStatus={false}
            ownerOptions={[]}
            readOnly
          />
        </div>
      </section>
    </div>
  );
}
