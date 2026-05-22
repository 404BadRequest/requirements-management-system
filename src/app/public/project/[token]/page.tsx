import { notFound } from "next/navigation";
import { getClients, getRequirements, getContractBudgets, getContractProfileAllocations, getTimeEntries } from "@/data/repositories/server-db";
import { RequirementKanbanBoard } from "@/components/requirements/requirement-kanban-board";
import { KpiCard } from "@/components/common/kpi-card";
import { Wallet, ListTodo } from "lucide-react";
import { verifyPortalToken } from "@/lib/portal/token";

// Statuses that represent closed/terminal requirements
const TERMINAL_STATUSES = new Set(["DONE_PROD", "WONT_DO", "CLOSED"]);

export default async function PublicProjectPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const clientId = await verifyPortalToken(token);

  const [clients, requirements, contracts, allocations, timeEntries, statusRows] = await Promise.all([
    getClients(),
    getRequirements(),
    getContractBudgets(),
    getContractProfileAllocations(),
    getTimeEntries(),
    import("@/data/repositories/server-db").then((m) => m.getCatalogByKind("requirement_status")),
  ]);

  const client = clientId ? clients.find((c) => c.id === clientId) : null;

  if (!client) {
    notFound();
  }

  const clientRequirements = requirements.filter((r) => r.clientId === client.id);
  const clientContracts = contracts.filter((c) => c.clientId === client.id);
  const clientContractIds = new Set(clientContracts.map((c) => c.id));

  const statusColumns = statusRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ code: row.code, label: row.label }));

  // Compute total quoted UF from profile allocations
  const totalQuotedUf = allocations
    .filter((a) => clientContractIds.has(a.contractId))
    .reduce((sum, a) => {
      const contract = clientContracts.find((c) => c.id === a.contractId);
      const rate = a.rateUfPerHour ?? contract?.rateUfPerHour ?? 0;
      return sum + (a.quotedMinutes / 60) * rate;
    }, 0);

  // Compute consumed UF from actual time entries
  const consumedUf = timeEntries
    .filter((e) => e.contractId && clientContractIds.has(e.contractId))
    .reduce((sum, e) => {
      const contract = clientContracts.find((c) => c.id === e.contractId);
      const rate = contract?.rateUfPerHour ?? 0;
      return sum + (e.durationMinutes / 60) * rate;
    }, 0);

  const budgetPercentage = totalQuotedUf > 0 ? (consumedUf / totalQuotedUf) * 100 : 0;
  const totalBudget = Math.round(totalQuotedUf * 10) / 10;
  const consumedBudget = Math.round(consumedUf * 10) / 10;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen del proyecto — actualización en tiempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard
          label="Estado de Presupuesto"
          value={`${budgetPercentage.toFixed(1)}%`}
          helper={`${consumedBudget} de ${totalBudget} UF consumidas`}
          icon={Wallet}
          variant={budgetPercentage > 90 ? "danger" : budgetPercentage > 75 ? "warning" : "default"}
        />
        <KpiCard
          label="Requerimientos Activos"
          value={clientRequirements.filter((r) => !TERMINAL_STATUSES.has(r.status)).length.toString()}
          helper={`De un total de ${clientRequirements.length} requerimientos`}
          icon={ListTodo}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Tablero de requerimientos</h2>
        <div className="rounded-[2px] border border-border bg-card p-4 shadow-soft">
          <RequirementKanbanBoard
            requirements={clientRequirements}
            statusColumns={statusColumns}
            canManageStatus={false}
            ownerOptions={[]}
            readOnly={true}
          />
        </div>
      </section>
    </div>
  );
}
