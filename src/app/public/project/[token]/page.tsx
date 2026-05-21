import { notFound } from "next/navigation";
import { getClients, getRequirements, getContractBudgets } from "@/data/repositories/server-db";
import { RequirementKanbanBoard } from "@/components/requirements/requirement-kanban-board";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { Wallet, ListTodo } from "lucide-react";

// En un caso real, esto desencriptaría el token o validaría un hash
// Para este demo, usaremos el ID del cliente directamente como "token"
export default async function PublicProjectPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  
  const [clients, requirements, contracts, statusRows] = await Promise.all([
    getClients(),
    getRequirements(),
    getContractBudgets(),
    import("@/data/repositories/server-db").then(m => m.getCatalogByKind("requirement_status")),
  ]);

  const client = clients.find(c => c.id === token);
  
  if (!client) {
    notFound();
  }

  const clientRequirements = requirements.filter(r => r.clientId === client.id);
  const clientContracts = contracts.filter(c => c.clientId === client.id);
  
  const statusColumns = statusRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ code: row.code, label: row.label }));
  
  const totalBudget = clientContracts.reduce((sum, c) => sum + (c.totalBudget ?? 0), 0);
  const consumedBudget = clientContracts.reduce((sum, c) => sum + (c.consumedBudget ?? 0), 0);
  const budgetPercentage = totalBudget > 0 ? (consumedBudget / totalBudget) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portal de Cliente</h1>
            <p className="text-muted-foreground">{client.name}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Vista de solo lectura
          </div>
        </header>

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
            value={clientRequirements.filter(r => r.status !== "cerrado").length.toString()}
            helper={`De un total de ${clientRequirements.length} requerimientos`}
            icon={ListTodo}
          />
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Tablero Kanban</h2>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <RequirementKanbanBoard 
              requirements={clientRequirements}
              statusColumns={statusColumns}
              canManageStatus={false}
              ownerOptions={[]} // No mostramos usuarios en la vista pública
              readOnly={true}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
