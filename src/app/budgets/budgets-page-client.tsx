"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { SyncStatusBanner } from "@/components/common/sync-status-banner";
import { BudgetForm } from "@/components/forms/budget-form";
import { RiskBadge } from "@/components/common/badges";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { scheduleUndoableAction } from "@/components/common/undoable-action";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { SettingsModal } from "@/components/settings/settings-modal";
import { budgetRiskLevel } from "@/lib/calculations/budget";
import { loadBudgetsPageData, createBudgetAction, deleteBudgetAction, updateBudgetAction } from "@/app/budgets/data-actions";
import type { Client, ContractBudget, ContractProfileAllocation, Profile, SettingsCatalogEntry } from "@/types/domain";

export type BudgetsPageClientProps = {
  canWrite: boolean;
  canExport: boolean;
};

type BudgetRow = {
  id: string;
  code: string;
  name: string;
  scopeCode: string;
  clientName: string;
  dateRange: string;
  quotedMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  quotedHoursDisplay: string;
  usedHoursDisplay: string;
  availableHoursDisplay: string;
  risk: "sin presupuesto" | "verde" | "amarillo" | "rojo";
};

export function BudgetsPageClient({ canWrite, canExport }: BudgetsPageClientProps) {
  const [contracts, setContracts] = useState<ContractBudget[]>([]);
  const [allocations, setAllocations] = useState<ContractProfileAllocation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [scopes, setScopes] = useState<SettingsCatalogEntry[]>([]);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [quotedMinutes, setQuotedMinutes] = useState(0);
  const [unallocatedMinutes, setUnallocatedMinutes] = useState(0);
  const [unallocatedCount, setUnallocatedCount] = useState(0);
  const [consumptionByContract, setConsumptionByContract] = useState<
    { contractId: string; quotedMinutes: number; usedMinutes: number; availableMinutes: number; consumptionPct: number }[]
  >([]);
  const [globalDecisionMetrics, setGlobalDecisionMetrics] = useState<{
    contractsAtRiskCount: number;
    contractsAtRiskPct: number;
    misallocationMinutes: number;
    misallocationCount: number;
    misallocationPct: number;
    misallocationRisk: "verde" | "amarillo" | "rojo";
    expectedMinutesByDateGlobal: number;
    deviationMinutesGlobal: number;
    deviationPctGlobal: number;
    deviationRiskGlobal: "verde" | "amarillo" | "rojo";
    burnRateMinutesPerWeekGlobal: number;
    topContractsByRisk: {
      contractId: string;
      code: string;
      name: string;
      clientName: string;
      healthScore: number;
      healthRisk: "verde" | "amarillo" | "rojo";
      healthFormulaLabel: string;
      usedHoursLabel: string;
      quotedHoursLabel: string;
      daysToDepletion: number | null;
    }[];
    usedUfTotal: number;
    quotedUfTotal: number;
    availableUfTotal: number;
  }>({
    contractsAtRiskCount: 0,
    contractsAtRiskPct: 0,
    misallocationMinutes: 0,
    misallocationCount: 0,
    misallocationPct: 0,
    misallocationRisk: "verde",
    expectedMinutesByDateGlobal: 0,
    deviationMinutesGlobal: 0,
    deviationPctGlobal: 0,
    deviationRiskGlobal: "verde",
    burnRateMinutesPerWeekGlobal: 0,
    topContractsByRisk: [],
    usedUfTotal: 0,
    quotedUfTotal: 0,
    availableUfTotal: 0,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContractBudget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await loadBudgetsPageData();
      setContracts(data.contracts);
      setAllocations(data.allocations);
      setProfiles(data.profiles);
      setClients(data.clients);
      setScopes(data.scopes);
      setUsedMinutes(data.usedMinutes);
      setQuotedMinutes(data.quotedMinutes);
      setUnallocatedMinutes(data.unallocatedMinutes ?? 0);
      setUnallocatedCount(data.unallocatedCount ?? 0);
      setConsumptionByContract(data.consumptionByContract);
      if (data.globalDecisionMetrics) {
        setGlobalDecisionMetrics(data.globalDecisionMetrics);
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudieron cargar los contratos.";
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const availableMinutes = quotedMinutes - usedMinutes;
  const scopeOptions = useMemo(
    () => scopes.filter((s) => s.active).map((s) => ({ code: s.code, label: s.label })),
    [scopes],
  );
  const scopeLabelByCode = useMemo(() => new Map(scopes.map((scope) => [scope.code, scope.label])), [scopes]);
  const clientName = useMemo(() => {
    const m = new Map(clients.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? id;
  }, [clients]);

  const budgetRows = useMemo<BudgetRow[]>(() => {
    const toDateOnly = (value: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toISOString().slice(0, 10);
    };
    const consumptionByContractId = new Map(consumptionByContract.map((row) => [row.contractId, row]));
    return contracts.map((contract) => {
      const contractAllocations = allocations.filter((allocation) => allocation.contractId === contract.id);
      const quotedByRows = contractAllocations.reduce((acc, allocation) => acc + allocation.quotedMinutes, 0);
      const contractConsumption = consumptionByContractId.get(contract.id);
      const used = contractConsumption?.usedMinutes ?? 0;
      const available = quotedByRows - used;
      return {
        id: contract.id,
        code: contract.code,
        name: contract.name,
        scopeCode: contract.scope,
        clientName: clientName(contract.clientId),
        dateRange: `${toDateOnly(contract.startDate)} → ${toDateOnly(contract.endDate)}`,
        quotedMinutes: quotedByRows,
        usedMinutes: used,
        availableMinutes: available,
        quotedHoursDisplay: `${(quotedByRows / 60).toFixed(2)} h`,
        usedHoursDisplay: `${(used / 60).toFixed(2)} h`,
        availableHoursDisplay: `${(available / 60).toFixed(2)} h`,
        risk: budgetRiskLevel(quotedByRows, used),
      };
    });
  }, [allocations, clientName, consumptionByContract, contracts]);

  const budgetColumns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => (
          <Link href={`/budgets/${row.original.id}`} className="font-mono text-xs text-primary hover:underline">
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Contrato",
        cell: ({ row }) => (
          <Link href={`/budgets/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "scopeCode",
        header: "Ámbito",
        cell: ({ row }) => scopeLabelByCode.get(row.original.scopeCode) ?? row.original.scopeCode,
      },
      { accessorKey: "clientName", header: "Cliente" },
      { accessorKey: "dateRange", header: "Vigencia" },
      {
        accessorKey: "quotedMinutes",
        header: "Horas cotizadas",
        meta: { align: "right" },
        cell: ({ row }) => row.original.quotedHoursDisplay,
      },
      {
        accessorKey: "usedMinutes",
        header: "Horas usadas",
        meta: { align: "right" },
        cell: ({ row }) => row.original.usedHoursDisplay,
      },
      {
        accessorKey: "availableMinutes",
        header: "Disponibles",
        meta: { align: "right" },
        cell: ({ row }) => row.original.availableHoursDisplay,
      },
      { accessorKey: "risk", header: "Riesgo", cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) =>
          canWrite ? (
            <RowActionMenu
              items={[
                {
                  label: "Editar",
                  onClick: () => {
                    const target = contracts.find((contract) => contract.id === row.original.id) ?? null;
                    if (!target) return;
                    setEditTarget(target);
                    setEditOpen(true);
                  },
                },
                {
                  label: "Eliminar",
                  danger: true,
                  onClick: () => setDeleteTarget(row.original),
                },
              ]}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [canWrite, contracts, reload, scopeLabelByCode],
  );

  const openCreateModal = () => {
    setFormKey((k) => k + 1);
    setCreateOpen(true);
  };

  const exportHref = "/api/export/budgets";
  const deviationHoursGlobal = Math.abs(globalDecisionMetrics.deviationMinutesGlobal / 60);
  const deviationDirectionGlobal = globalDecisionMetrics.deviationMinutesGlobal >= 0 ? "sobre plan" : "bajo plan";

  return (
    <>
      <PageHeader
        title="Contratos y disponibilidad"
        description="Control contractual de horas cotizadas, usadas y riesgo"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
            {canWrite ? (
              <button type="button" className="btn-primary py-2 text-sm" onClick={() => openCreateModal()}>
                Nuevo contrato
              </button>
            ) : null}
          </div>
        }
      />
      <SyncStatusBanner
        loading={loading && contracts.length > 0}
        error={listError}
        lastSyncedAt={lastSyncedAt}
        onRetry={() => {
          void reload();
        }}
        loadingLabel="Actualizando contratos…"
      />

      {contracts.length > 0 ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Contratos en riesgo</p>
              <p className="text-2xl font-semibold">{globalDecisionMetrics.contractsAtRiskCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{globalDecisionMetrics.contractsAtRiskPct.toFixed(1)}% de cartera</p>
            </article>
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Mala asignación global</p>
              <p className="text-2xl font-semibold">{(globalDecisionMetrics.misallocationMinutes / 60).toFixed(2)} h</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {globalDecisionMetrics.misallocationCount} registros · {globalDecisionMetrics.misallocationPct.toFixed(1)}%
              </p>
              <div className="mt-1">
                <RiskBadge risk={globalDecisionMetrics.misallocationRisk} />
              </div>
            </article>
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Desviación global vs plan</p>
              <p className="text-2xl font-semibold">{deviationHoursGlobal.toFixed(2)} h</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {deviationDirectionGlobal} · {globalDecisionMetrics.deviationPctGlobal.toFixed(1)}%
              </p>
              <div className="mt-1">
                <RiskBadge risk={globalDecisionMetrics.deviationRiskGlobal} />
              </div>
            </article>
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Velocidad semanal</p>
              <p className="text-2xl font-semibold">{(globalDecisionMetrics.burnRateMinutesPerWeekGlobal / 60).toFixed(2)} h</p>
              <p className="mt-1 text-xs text-muted-foreground">Promedio últimas 4 semanas</p>
            </article>
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">UF equivalente</p>
              <p className="text-lg font-semibold">{globalDecisionMetrics.usedUfTotal.toFixed(1)} / {globalDecisionMetrics.quotedUfTotal.toFixed(1)} UF</p>
              <p className="mt-1 text-xs text-muted-foreground">Disponible: {globalDecisionMetrics.availableUfTotal.toFixed(1)} UF</p>
            </article>
          </section>
          <article className="surface-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top contratos por riesgo</h2>
              <span className="text-xs text-muted-foreground">{globalDecisionMetrics.topContractsByRisk.length} contrato(s)</span>
            </div>
            {globalDecisionMetrics.topContractsByRisk.length > 0 ? (
              <ul className="space-y-2">
                {globalDecisionMetrics.topContractsByRisk.map((item) => (
                  <li key={item.contractId} className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-border/70 bg-muted/15 px-3 py-2">
                    <div className="min-w-0">
                      <Link href={`/budgets/${item.contractId}`} className="font-medium text-primary hover:underline">
                        {item.code} · {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.clientName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{item.usedHoursLabel} / {item.quotedHoursLabel}</span>
                      <span className="text-muted-foreground">
                        {item.daysToDepletion === null ? "Sin proyección" : `${item.daysToDepletion} días`}
                      </span>
                      <span className="font-medium">{item.healthScore}/100</span>
                      <RiskBadge risk={item.healthRisk} />
                    </div>
                    <p className="w-full text-[11px] text-muted-foreground">{item.healthFormulaLabel}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hay contratos suficientes para priorizar riesgo.</p>
            )}
          </article>
          <section className="grid gap-3 md:grid-cols-3">
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Horas cotizadas</p>
              <p className="text-2xl font-semibold">{(quotedMinutes / 60).toFixed(2)}</p>
            </article>
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Horas usadas</p>
              <p className="text-2xl font-semibold">{(usedMinutes / 60).toFixed(2)}</p>
            </article>
            <article className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Disponibles</p>
              <p className="text-2xl font-semibold">{(availableMinutes / 60).toFixed(2)}</p>
              <RiskBadge risk={budgetRiskLevel(quotedMinutes, usedMinutes)} />
            </article>
          </section>
          {unallocatedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>
                Hay {unallocatedCount} hora(s) sin asignación contractual ({(unallocatedMinutes / 60).toFixed(2)} h) para corregir.
              </span>
              <Link
                href="/time-entries?contractStatus=unassigned"
                className="inline-flex items-center rounded-[2px] border border-amber-500/60 px-2 py-1 font-medium text-amber-900 no-underline hover:bg-amber-100"
              >
                Ver listado de horas a corregir
              </Link>
            </div>
          ) : null}
        </>
      ) : null}

      {canWrite ? (
        <SettingsModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Nuevo contrato"
          description="Define vigencia del contrato y la bolsa de horas por perfil."
          dialogClassName="max-w-xl max-h-none overflow-visible"
          bodyClassName="py-4"
        >
          {scopeOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Configura ámbitos en Configuración antes de crear contratos.</p>
          ) : (
            <BudgetForm
              key={formKey}
              clients={clients.map((client) => ({ id: client.id, name: client.name }))}
              scopes={scopeOptions}
              profiles={profiles.map((profile) => ({ id: profile.id, name: profile.name }))}
              onSubmit={async (values) => {
                try {
                  await createBudgetAction(values);
                  toast.success("Contrato registrado");
                  setCreateOpen(false);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo crear el contrato.");
                }
              }}
            />
          )}
        </SettingsModal>
      ) : null}
      {canWrite ? (
        <SettingsModal
          open={editOpen && Boolean(editTarget)}
          onClose={() => {
            setEditOpen(false);
            setEditTarget(null);
          }}
          title="Editar contrato"
          description={editTarget ? `Actualiza la configuración de «${editTarget.name}».` : "Edita contrato"}
          dialogClassName="max-w-xl max-h-none overflow-visible"
          bodyClassName="py-4"
        >
          {editTarget ? (
            <BudgetForm
              key={`edit-${editTarget.id}-${formKey}`}
              clients={clients.map((client) => ({ id: client.id, name: client.name }))}
              scopes={scopeOptions}
              profiles={profiles.map((profile) => ({ id: profile.id, name: profile.name }))}
              submitLabel="Guardar cambios"
              defaultValues={{
                projectId: editTarget.projectId,
                clientId: editTarget.clientId,
                scope: editTarget.scope,
                code: editTarget.code,
                name: editTarget.name,
                startDate: editTarget.startDate,
                endDate: editTarget.endDate,
                rateUfPerHour: editTarget.rateUfPerHour,
                markupPercentage: editTarget.markupPercentage,
                opexPercentage: editTarget.opexPercentage,
                allocations:
                  allocations
                    .filter((allocation) => allocation.contractId === editTarget.id)
                    .map((allocation) => ({
                      profileId: allocation.profileId,
                      quotedMinutes: allocation.quotedMinutes,
                      rateUfPerHour: allocation.rateUfPerHour,
                    })) ?? [],
              }}
              onSubmit={async (values) => {
                try {
                  await updateBudgetAction(editTarget.id, values);
                  toast.success("Contrato actualizado");
                  setEditOpen(false);
                  setEditTarget(null);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo actualizar el contrato.");
                }
              }}
            />
          ) : null}
        </SettingsModal>
      ) : null}

      {/* Controlled delete confirmation — triggered by RowActionMenu */}
      {canWrite && deleteTarget ? (
        <ConfirmDialog
          label="Eliminar"
          title={`¿Eliminar contrato «${deleteTarget.name}»?`}
          open={true}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
          onConfirm={() => {
            const id = deleteTarget.id;
            setDeleteTarget(null);
            try {
              scheduleUndoableAction({
                pendingMessage: "Contrato marcado para eliminar.",
                successMessage: "Contrato eliminado.",
                errorMessage: "No se pudo eliminar el contrato.",
                onCommit: async () => {
                  await deleteBudgetAction(id);
                  await reload();
                },
              });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo eliminar el contrato.");
            }
          }}
        />
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contratos</h2>
        {loading && contracts.length === 0 ? (
          <div className="skeleton-shimmer h-32 rounded-[2px] border border-border" aria-busy aria-label="Cargando contratos" />
        ) : contracts.length === 0 ? (
          <div className="surface-card p-[length:var(--density-inset-pad)]">
            <EmptyState
              title="No hay contratos registrados"
              description="Aún no se han configurado contratos ni presupuestos en el sistema."
              compact
              action={
                canWrite ? (
                  <button type="button" className="btn-primary py-2 text-sm" onClick={openCreateModal}>
                    Crear primer contrato
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <DataTable
            data={budgetRows}
            columns={budgetColumns}
            globalFilterPlaceholder="Buscar por contrato, ámbito o cliente…"
            pageSize={20}
            emptyTitle="Sin contratos"
            emptyDescription="Añade contratos con «Nuevo contrato»."
            emptyAction={
              canWrite ? (
                <button type="button" className="btn-primary py-2 text-sm" onClick={() => openCreateModal()}>
                  Crear contrato
                </button>
              ) : (
                <a href="/settings/budget-scopes" className="btn-secondary py-2 text-sm no-underline">
                  Ver ámbitos de presupuesto
                </a>
              )
            }
          />
        )}
      </section>
    </>
  );
}
