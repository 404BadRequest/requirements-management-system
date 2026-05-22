"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { createProfileAction, deleteProfileAction, updateProfileAction } from "@/app/settings/actions";
import { DataTable } from "@/components/common/data-table";
import { formatHourlyRateDisplay } from "@/lib/formatting/rates";
import type { Profile } from "@/types/domain";
import { SettingsDeleteConfirm } from "@/components/settings/settings-delete-confirm";
import { SettingsModal } from "@/components/settings/settings-modal";
import { SettingsTableToolbar } from "@/components/settings/settings-table-toolbar";
import { RowActionMenu } from "@/components/common/row-action-menu";

export type ProfileTableRow = Profile & { linkedCount: number };

const PRESET_UNITS = [
  { value: "CLP", label: "CLP" },
  { value: "UF", label: "UF" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "__custom__", label: "Otra" },
] as const;

export function SettingsProfilesPanel({ profiles }: { profiles: ProfileTableRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ProfileTableRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileTableRow | null>(null);

  const columns = useMemo<ColumnDef<ProfileTableRow>[]>(
    () => [
      { accessorKey: "name", header: "Perfil" },
      {
        id: "rate",
        header: "Tarifa referencia",
        accessorFn: (row) => formatHourlyRateDisplay(row.hourlyRate, row.rateCurrency),
        sortingFn: (a, b) => a.original.hourlyRate - b.original.hourlyRate,
      },
      {
        accessorKey: "rateCurrency",
        header: "Unidad",
        cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.rateCurrency}</span>,
      },
      {
        accessorKey: "linkedCount",
        header: "Usuarios",
        meta: { align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{row.original.linkedCount}</span>,
      },
      {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) =>
          row.original.active ? (
            <span className="rounded-[2px] border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Activo</span>
          ) : (
            <span className="rounded-[2px] border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactivo</span>
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <RowActionMenu
            items={[
              { label: "Editar", onClick: () => setEditProfile(row.original) },
              { label: "Eliminar", danger: true, onClick: () => setDeleteTarget(row.original) },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <section className="surface-card flex flex-col gap-5 p-[length:var(--density-inset-pad)]">
      {deleteTarget ? (
        <SettingsDeleteConfirm
          title="¿Eliminar este perfil?"
          summary="No podrás eliminarlo si hay usuarios asignados."
          action={deleteProfileAction.bind(null, deleteTarget.id)}
          pendingMessage="Perfil marcado para eliminar."
          successMessage="Perfil eliminado."
          errorMessage="No se pudo eliminar el perfil."
          open
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
        />
      ) : null}
      <SettingsTableToolbar
        title="Perfiles y tarifas"
        description="Cada usuario debe tener un perfil. La tarifa alimenta el estimado facturable."
        actionLabel="Nuevo perfil"
        onAction={() => setCreateOpen(true)}
      />
      <DataTable
        data={profiles}
        columns={columns}
        globalFilterPlaceholder="Buscar por nombre o unidad…"
        pageSize={12}
        emptyTitle="Sin perfiles"
        emptyDescription="Crea el primer perfil de tarifa con «Nuevo perfil»."
      />

      <SettingsModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo perfil">
        <ProfileForm action={createProfileAction} submitLabel="Crear perfil" onDone={() => setCreateOpen(false)} />
      </SettingsModal>

      <SettingsModal open={!!editProfile} onClose={() => setEditProfile(null)} title="Editar perfil">
        {editProfile ? (
          <ProfileForm
            key={editProfile.id}
            action={updateProfileAction.bind(null, editProfile.id)}
            submitLabel="Guardar cambios"
            initial={editProfile}
            onDone={() => setEditProfile(null)}
          />
        ) : null}
      </SettingsModal>
    </section>
  );
}

function ProfileForm({
  action,
  submitLabel,
  initial,
  onDone,
}: {
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  initial?: Profile;
  onDone: () => void;
}) {
  const router = useRouter();
  const initialMode =
    initial && (initial.rateCurrency === "CLP" || initial.rateCurrency === "UF" || initial.rateCurrency === "USD")
      ? initial.rateCurrency
      : "__custom__";
  const [mode, setMode] = useState<string>(initialMode);
  const [customUnit, setCustomUnit] = useState(initialMode === "__custom__" && initial ? initial.rateCurrency : "");
  const [rate, setRate] = useState(initial ? String(initial.hourlyRate) : "");

  const resolvedCurrency = mode === "__custom__" ? customUnit.trim() || "CLP" : mode;

  return (
    <form
      className="grid gap-4"
      action={async (fd) => {
        await action(fd);
        router.refresh();
        onDone();
      }}
    >
      <input type="hidden" name="hourlyRate" value={String(Number.parseFloat(rate.replace(",", ".")) || 0)} />
      <input type="hidden" name="rateCurrency" value={resolvedCurrency} />
      <label className="grid gap-1.5">
        <span className="field-label">Nombre del perfil</span>
        <input name="name" required defaultValue={initial?.name} className="field-control text-sm" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Tarifa por hora</span>
        <input
          type="number"
          min={0}
          step="any"
          required
          className="field-control tabular-nums"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Unidad</span>
        <select className="field-control text-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
          {PRESET_UNITS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {mode === "__custom__" ? (
        <label className="grid gap-1.5">
          <span className="field-label">Etiqueta (EUR, GBP…)</span>
          <input
            className="field-control text-sm"
            placeholder="Ej. EUR"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
          />
        </label>
      ) : null}
      <label className="grid gap-1.5">
        <span className="field-label">Estado</span>
        <select name="active" defaultValue={initial?.active !== false ? "true" : "false"} className="field-control text-sm">
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        Vista previa:{" "}
        <span className="font-medium tabular-nums text-foreground">
          {formatHourlyRateDisplay(Number.parseFloat(rate.replace(",", ".")) || 0, resolvedCurrency)}
        </span>
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
