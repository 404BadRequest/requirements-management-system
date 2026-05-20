import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ContractDetailPanel } from "@/components/budgets/contract-detail-panel";
import { loadBudgetContractDetailData } from "@/app/budgets/data-actions";

function toDateOnly(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

export default async function BudgetContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;

  let data: Awaited<ReturnType<typeof loadBudgetContractDetailData>>;
  try {
    data = await loadBudgetContractDetailData(contractId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se encontró el contrato solicitado.";
    if (message.includes("No se encontró el contrato")) {
      notFound();
    }
    throw error;
  }

  return (
    <AppShell>
      <PageHeader
        title={`Ficha de contrato · ${data.contract.code}`}
        description={`${data.contract.name} · ${data.client?.name ?? data.contract.clientId} · Inicio ${toDateOnly(data.contract.startDate)} · Fin ${toDateOnly(data.contract.endDate)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/budgets" className="btn-secondary py-2 text-sm no-underline">
              Volver a contratos
            </Link>
          </div>
        }
      />

      <ContractDetailPanel
        contractId={contractId}
        quotedMinutes={data.quotedMinutes}
        usedMinutes={data.usedMinutes}
        availableMinutes={data.availableMinutes}
        unallocatedCount={data.unallocatedCount}
        unallocatedMinutes={data.unallocatedMinutes}
        profileAllocationRows={data.profileAllocationRows}
        correctionRows={data.correctionRows}
        users={data.users}
        requirements={data.requirements}
        contracts={data.contracts}
        contractProfiles={data.contractProfiles}
        categories={data.categories}
        canPickAnyOwner={data.canPickAnyOwner}
        expectedMinutesByDate={data.expectedMinutesByDate}
        misallocationPct={data.misallocationPct}
        misallocationRisk={data.misallocationRisk}
        topRiskProfiles={data.topRiskProfiles}
        topRequirementRows={data.topRequirementRows}
        clients={data.clients}
      />
    </AppShell>
  );
}
