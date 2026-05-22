import { notFound } from "next/navigation";
import { getClients, getRequirements, getContractBudgets } from "@/data/repositories/server-db";
import { RequirementKanbanBoard } from "@/components/requirements/requirement-kanban-board";
import { KpiCard } from "@/components/common/kpi-card";
import { Wallet, ListTodo } from "lucide-react";
import { verifyPortalToken } from "@/lib/portal/token";

export default async function PublicProjectPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const clientId = await verifyPortalToken(token);

  const [clients, requirements, contracts, statusRows] = await Promise.all([
    getClients(),
    getRequirements(),
    getContractBudgets(),
    import("@/data/repositories/server-db").then((m) => m.getCatalogByKind("requirement_status")),
  ]);

  const client = clientId ? clients.find((c) => c.id === clientId) : null;

  if (!client) {
    notFound();
  }

  const clientRequirements = requirements.filter((r) => r.clientId === client.id);
  const clientContracts = contracts.filter((c) => c.clientId === client.id);

  const statusColumns = statusRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ code: row.code, label: row.label }));

  const totalBudget = clientContracts.reduce((sum, c) => sum + ((c as unknown as { totalBudget?: number }).totalBudget ?? 0), 0);
  const consumedBudget = clientContracts.reduce((sum, c) => sum + ((c as unknown as { consumedBudget?: number }).consumedBudget ?? 0), 0);
  const budgetPercentage = totalBudget > 0 ? (consumedBudget / totalBudget) * 100 : 0;

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
          value={clientRequirements.filter((r) => r.status !== "cerrado").length.toString()}
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
