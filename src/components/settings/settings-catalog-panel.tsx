"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { createCatalogFromFormAction, deleteCatalogAction, updateCatalogAction } from "@/app/settings/actions";
import { DataTable } from "@/components/common/data-table";
import type { SettingsCatalogEntry, SettingsCatalogKind } from "@/types/domain";
import { SettingsDeleteConfirm } from "@/components/settings/settings-delete-confirm";
import { SettingsModal } from "@/components/settings/settings-modal";
import { SettingsTableToolbar } from "@/components/settings/settings-table-toolbar";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { CATALOG_COLOR_KEYS, CATALOG_COLORS, type CatalogColor } from "@/lib/catalog-colors";
import { cn } from "@/lib/utils/cn";

export function SettingsCatalogPanel({
  kind,
  title,
  description,
  rows,
  canWrite = false,
}: {
  kind: SettingsCatalogKind;
  title: string;
  description: string;
  rows: SettingsCatalogEntry[];
  canWrite?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<SettingsCatalogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettingsCatalogEntry | null>(null);

  const columns = useMemo<ColumnDef<SettingsCatalogEntry>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
      },
      { accessorKey: "label", header: "Etiqueta" },
      {
        accessorKey: "color",
        header: "Color",
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original.color as CatalogColor | null;
          return c && CATALOG_COLORS[c] ? (
            <span
              className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", CATALOG_COLORS[c].classes.bg, CATALOG_COLORS[c].classes.text)}
            >
              <span className={cn("h-2 w-2 rounded-full", CATALOG_COLORS[c].classes.dot)} />
              {CATALOG_COLORS[c].label}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "sortOrder",
        header: "Orden",
        meta: { align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span>,
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
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              enableSorting: false,
              enableGlobalFilter: false,
              cell: ({ row }: { row: { original: SettingsCatalogEntry } }) => (
                <RowActionMenu
                  items={[
                    { label: "Editar", onClick: () => setEditRow(row.original) },
                    { label: "Eliminar", danger: true, onClick: () => setDeleteTarget(row.original) },
                  ]}
                />
              ),
            } satisfies ColumnDef<SettingsCatalogEntry>,
          ]
        : []),
    ],
    [canWrite],
  );

  return (
    <section className="surface-card flex flex-col gap-5 p-[length:var(--density-inset-pad)]">
      {deleteTarget ? (
        <SettingsDeleteConfirm
          title="¿Eliminar esta entrada?"
          summary="Solo es posible si no está en uso en requerimientos, horas o presupuesto."
          action={deleteCatalogAction.bind(null, deleteTarget.id)}
          pendingMessage="Entrada marcada para eliminar."
          successMessage="Entrada eliminada."
          errorMessage="No se pudo eliminar la entrada."
          open
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
        />
      ) : null}
      <SettingsTableToolbar
        title={title}
        description={description}
        actionLabel="Nueva entrada"
        onAction={canWrite ? () => setCreateOpen(true) : undefined}
      />
      <DataTable
        data={rows}
        columns={columns}
        globalFilterPlaceholder="Buscar por código o etiqueta…"
        pageSize={15}
        emptyTitle="Catálogo vacío"
        emptyDescription="Añade la primera entrada con «Nueva entrada»."
      />

      <SettingsModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva entrada en catálogo">
        <CatalogEntryForm
          kind={kind}
          action={createCatalogFromFormAction}
          submitLabel="Añadir"
          onDone={() => setCreateOpen(false)}
        />
      </SettingsModal>

      <SettingsModal open={!!editRow} onClose={() => setEditRow(null)} title="Editar entrada">
        {editRow ? (
          <CatalogEntryForm
            key={editRow.id}
            kind={kind}
            action={updateCatalogAction.bind(null, editRow.id)}
            submitLabel="Guardar"
            initial={editRow}
            onDone={() => setEditRow(null)}
          />
        ) : null}
      </SettingsModal>
    </section>
  );
}

function ColorPicker({ initialColor }: { initialColor: string | null }) {
  const [selected, setSelected] = useState<string>(initialColor ?? "");
  return (
    <fieldset className="grid gap-2">
      <legend className="field-label">Color</legend>
      <input type="hidden" name="color" value={selected} />
      <div className="flex flex-wrap gap-2">
        {CATALOG_COLOR_KEYS.map((token) => {
          const def = CATALOG_COLORS[token];
          const isSelected = selected === token;
          return (
            <button
              key={token}
              type="button"
              title={def.label}
              onClick={() => setSelected(isSelected ? "" : token)}
              className={cn(
                "h-7 w-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                def.classes.dot,
                isSelected ? "ring-2 ring-ring ring-offset-2 scale-110" : "opacity-70 hover:opacity-100 hover:scale-105",
              )}
              aria-label={def.label}
              aria-pressed={isSelected}
            />
          );
        })}
        <button
          type="button"
          title="Sin color"
          onClick={() => setSelected("")}
          className={cn(
            "h-7 w-7 rounded-full border-2 border-dashed border-border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selected === "" ? "ring-2 ring-ring ring-offset-2 scale-110 border-foreground/40" : "opacity-60 hover:opacity-100",
          )}
          aria-label="Sin color (automático)"
          aria-pressed={selected === ""}
        />
      </div>
      {selected && CATALOG_COLORS[selected as CatalogColor] ? (
        <p className="text-xs text-muted-foreground">
          Seleccionado: <span className="font-medium text-foreground">{CATALOG_COLORS[selected as CatalogColor].label}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Sin color — se usará color automático según el código.</p>
      )}
    </fieldset>
  );
}

function CatalogEntryForm({
  kind,
  action,
  submitLabel,
  initial,
  onDone,
}: {
  kind: SettingsCatalogKind;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  initial?: SettingsCatalogEntry;
  onDone: () => void;
}) {
  const router = useRouter();
  return (
    <form
      className="grid gap-4"
      action={async (fd) => {
        await action(fd);
        router.refresh();
        onDone();
      }}
    >
      {!initial ? <input type="hidden" name="kind" value={kind} /> : null}
      <label className="grid gap-1.5">
        <span className="field-label">Código</span>
        <input name="code" required defaultValue={initial?.code} className="field-control font-mono text-sm" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Etiqueta</span>
        <input name="label" required defaultValue={initial?.label} className="field-control text-sm" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Orden</span>
        <input name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} className="field-control tabular-nums text-sm" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Estado</span>
        <select name="active" defaultValue={initial?.active !== false ? "true" : "false"} className="field-control text-sm">
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </label>
      <ColorPicker initialColor={initial?.color ?? null} />
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
