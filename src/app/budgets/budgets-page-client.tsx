"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { SyncStatusBanner } from "@/components/common/sync-status-banner";
import { BudgetForm } from "@/components/forms/budget-form";
import { RiskBadge } from "@/components/common/badges";
import { SettingsModal } from "@/components/settings/settings-modal";
import { budgetRiskLevel } from "@/lib/calculations/budget";
import { loadBudgetsPageData, createBudgetAction } from "@/app/budgets/data-actions";
import type { BudgetAllocation, Profile, SettingsCatalogEntry } from "@/types/domain";

export type BudgetsPageClientProps = {
  canWrite: boolean;
  canExport: boolean;
};

type BudgetRow = {
  id: string;
  scopeLabel: string;
  profileName: string;
  quotedMinutes: number;
  quotedHoursDisplay: string;
};

export function BudgetsPageClient({ canWrite, canExport }: BudgetsPageClientProps) {
  const [budgets, setBudgets] = useState<BudgetAllocation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [scopes, setScopes] = useState<SettingsCatalogEntry[]>([]);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await loadBudgetsPageData();
      setBudgets(data.budgets);
      setProfiles(data.profiles);
      setScopes(data.scopes);
      setUsedMinutes(data.usedMinutes);
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudieron cargar los presupuestos.";
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const quotedMinutes = useMemo(() => budgets.reduce((acc, item) => acc + item.quotedMinutes, 0), [budgets]);
  const availableMinutes = quotedMinutes - usedMinutes;

  const scopeOptions = useMemo(
    () => scopes.filter((s) => s.active).map((s) => ({ code: s.code, label: s.label })),
    [scopes],
  );
  const scopeLabel = useMemo(() => {
    const m = new Map(scopes.map((s) => [s.code, s.label]));
    return (code: string) => m.get(code) ?? code;
  }, [scopes]);

  const profileName = useMemo(() => {
    const m = new Map(profiles.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? id;
  }, [profiles]);

  const budgetRows = useMemo<BudgetRow[]>(
    () =>
      budgets.map((b) => ({
        id: b.id,
        scopeLabel: scopeLabel(b.scope),
        profileName: profileName(b.profileId),
        quotedMinutes: b.quotedMinutes,
        quotedHoursDisplay: `${(b.quotedMinutes / 60).toFixed(1)} h`,
      })),
    [budgets, scopeLabel, profileName],
  );

  const budgetColumns = useMemo<ColumnDef<BudgetRow>[]>(
    () => [
      { accessorKey: "scopeLabel", header: "Ámbito" },
      { accessorKey: "profileName", header: "Perfil" },
      {
        accessorKey: "quotedMinutes",
        header: "Horas cotizadas",
        meta: { align: "right" },
        cell: ({ row }) => row.original.quotedHoursDisplay,
      },
    ],
    [],
  );

  const openCreateModal = () => {
    setFormKey((k) => k + 1);
    setCreateOpen(true);
  };

  const exportHref = "/api/export/budgets";

  return (
    <>
      <PageHeader
        title="Presupuesto y disponibilidad"
        description="Control de horas cotizadas, usadas y riesgo"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
            {canWrite ? (
              <button type="button" className="btn-primary py-2 text-sm" onClick={() => openCreateModal()}>
                Nueva asignación
              </button>
            ) : null}
          </div>
        }
      />
      <SyncStatusBanner
        loading={loading && budgets.length > 0}
        error={listError}
        lastSyncedAt={lastSyncedAt}
        onRetry={() => {
          void reload();
        }}
        loadingLabel="Actualizando presupuestos…"
      />
      {loading && budgets.length === 0 ? (
        <div
          className="skeleton-shimmer h-44 rounded-[2px] border border-border"
          aria-busy
          aria-label="Cargando presupuestos"
        />
      ) : null}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas cotizadas</p>
          <p className="text-2xl font-semibold">{(quotedMinutes / 60).toFixed(1)}</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas usadas</p>
          <p className="text-2xl font-semibold">{(usedMinutes / 60).toFixed(1)}</p>
        </article>
        <article className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-semibold">{(availableMinutes / 60).toFixed(1)}</p>
          <RiskBadge risk={budgetRiskLevel(quotedMinutes, usedMinutes)} />
        </article>
      </section>

      {canWrite ? (
        <SettingsModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Nueva asignación de presupuesto"
          description="Vincula un ámbito de presupuesto con un perfil de tarifa y las horas cotizadas."
        >
          {scopeOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Configura ámbitos (scopes) en Configuración antes de crear asignaciones.</p>
          ) : (
            <BudgetForm
              key={formKey}
              scopes={scopeOptions}
              profiles={profiles.map((profile) => ({ id: profile.id, name: profile.name }))}
              onSubmit={async (values) => {
                try {
                  await createBudgetAction(values);
                  toast.success("Presupuesto registrado");
                  setCreateOpen(false);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo crear la asignación.");
                }
              }}
            />
          )}
        </SettingsModal>
      ) : null}

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Asignaciones</h2>
        <DataTable
          data={budgetRows}
          columns={budgetColumns}
          globalFilterPlaceholder="Buscar por ámbito o perfil…"
          pageSize={20}
          emptyTitle="Sin asignaciones"
          emptyDescription="Añade líneas de presupuesto con «Nueva asignación»."
          emptyAction={
            canWrite ? (
              <button type="button" className="btn-primary py-2 text-sm" onClick={() => openCreateModal()}>
                Crear asignación
              </button>
            ) : (
              <a href="/settings/budget-scopes" className="btn-secondary py-2 text-sm no-underline">
                Ver ámbitos de presupuesto
              </a>
            )
          }
        />
      </div>
    </>
  );
}
