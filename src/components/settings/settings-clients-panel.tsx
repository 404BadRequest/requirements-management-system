"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { createClientAction, deleteClientAction, updateClientAction, getPortalTokenAction } from "@/app/settings/actions";
import { DataTable } from "@/components/common/data-table";
import type { Client } from "@/types/domain";
import { SettingsDeleteConfirm } from "@/components/settings/settings-delete-confirm";
import { SettingsModal } from "@/components/settings/settings-modal";
import { SettingsTableToolbar } from "@/components/settings/settings-table-toolbar";
import { toast } from "sonner";
import { RowActionMenu } from "@/components/common/row-action-menu";

export function SettingsClientsPanel({ clients }: { clients: Client[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const columns = useMemo<ColumnDef<Client>[]>(
    () => [
      { accessorKey: "name", header: "Nombre" },
      {
        accessorKey: "code",
        header: "Código",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
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
        header: "Acciones",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const clientId = row.original.id;
          const getPortalUrl = async () => {
            const token = await getPortalTokenAction(clientId);
            return `${window.location.origin}/public/project/${token}`;
          };
          return (
            <RowActionMenu
              items={[
                {
                  label: "Copiar enlace portal",
                  onClick: async () => {
                    try {
                      const url = await getPortalUrl();
                      await navigator.clipboard.writeText(url);
                      toast.success("Enlace público copiado al portapapeles");
                    } catch {
                      toast.error("No se pudo copiar el enlace");
                    }
                  },
                },
                {
                  label: "Abrir portal",
                  onClick: async () => {
                    try {
                      const url = await getPortalUrl();
                      window.open(url, "_blank", "noopener,noreferrer");
                    } catch {
                      toast.error("No se pudo abrir el portal");
                    }
                  },
                },
                { label: "Editar", onClick: () => setEditClient(row.original) },
                { label: "Eliminar", danger: true, onClick: () => setDeleteTarget(row.original) },
              ]}
            />
          );
        },
      },
    ],
    // setEditClient and setDeleteTarget are stable setState refs — no need to include
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <section className="surface-card flex flex-col gap-5 p-[length:var(--density-inset-pad)]">
      {deleteTarget ? (
        <SettingsDeleteConfirm
          title="¿Eliminar este cliente?"
          summary="No podrás eliminarlo si tiene requerimientos asociados."
          action={deleteClientAction.bind(null, deleteTarget.id)}
          pendingMessage="Cliente marcado para eliminar."
          successMessage="Cliente eliminado."
          errorMessage="No se pudo eliminar el cliente."
          open
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
        />
      ) : null}
      <SettingsTableToolbar
        title="Clientes"
        description="Directorio usado en requerimientos y reportes de horas."
        actionLabel="Nuevo cliente"
        onAction={() => setCreateOpen(true)}
      />
      <DataTable
        data={clients}
        columns={columns}
        globalFilterPlaceholder="Buscar por nombre o código…"
        pageSize={12}
        emptyTitle="Sin clientes"
        emptyDescription="Registra el primer cliente con «Nuevo cliente»."
      />

      <SettingsModal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo cliente">
        <ClientForm action={createClientAction} submitLabel="Crear cliente" onDone={() => setCreateOpen(false)} />
      </SettingsModal>

      <SettingsModal open={!!editClient} onClose={() => setEditClient(null)} title="Editar cliente">
        {editClient ? (
          <ClientForm
            key={editClient.id}
            action={updateClientAction.bind(null, editClient.id)}
            submitLabel="Guardar"
            initial={editClient}
            onDone={() => setEditClient(null)}
          />
        ) : null}
      </SettingsModal>
    </section>
  );
}

function ClientForm({
  action,
  submitLabel,
  initial,
  onDone,
}: {
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  initial?: Client;
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
      <label className="grid gap-1.5">
        <span className="field-label">Nombre</span>
        <input name="name" required defaultValue={initial?.name} className="field-control text-sm" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Código</span>
        <input name="code" required defaultValue={initial?.code} className="field-control font-mono text-sm" placeholder="Ej. ACME" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Estado</span>
        <select name="active" defaultValue={initial?.active !== false ? "true" : "false"} className="field-control text-sm">
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </label>
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
