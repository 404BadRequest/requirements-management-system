"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/common/data-table";
import { UserAvatar } from "@/components/common/user-avatar";
import { RowActionMenu } from "@/components/common/row-action-menu";

export type TeamDirectoryRow = {
  id: string;
  name: string;
  email: string;
  profileLabel: string;
  rateLabel: string;
  hours: number;
  hoursDisplay: string;
  estimateLabel: string;
  reqsAssigned: number;
  activeLabel: string;
};

export function TeamDirectoryTable({ rows }: { rows: TeamDirectoryRow[] }) {
  const columns = useMemo<ColumnDef<TeamDirectoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Persona",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={row.original.name} />
            <span className="truncate font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ row }) => <span className="truncate text-muted-foreground">{row.original.email}</span>,
      },
      { accessorKey: "profileLabel", header: "Perfil" },
      { accessorKey: "rateLabel", header: "Tarifa referencia" },
      {
        accessorKey: "hours",
        header: "Horas",
        meta: { align: "right" },
        cell: ({ row }) => row.original.hoursDisplay,
      },
      {
        accessorKey: "estimateLabel",
        header: "Estimado",
        meta: { align: "right" },
      },
      {
        accessorKey: "reqsAssigned",
        header: "Requerimientos",
        meta: { align: "right" },
      },
      { accessorKey: "activeLabel", header: "Estado" },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const email = row.original.email;
          return (
            <RowActionMenu
              items={[
                {
                  label: "Copiar correo",
                  onClick: async () => {
                    try {
                      await navigator.clipboard.writeText(email);
                      toast.success("Correo copiado al portapapeles");
                    } catch {
                      toast.error("No se pudo copiar (permiso del navegador o contexto inseguro)");
                    }
                  },
                },
                {
                  label: "Redactar correo",
                  onClick: () => {
                    window.open(`mailto:${email}`, "_blank");
                  },
                },
              ]}
            />
          );
        },
      },
    ],
    [],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      globalFilterPlaceholder="Buscar por nombre, correo, perfil…"
      pageSize={20}
      emptyTitle="Sin personas"
      emptyDescription="No hay usuarios para el filtro actual o aun no existe directorio."
      emptyAction={
        <a href="/settings/users" className="btn-secondary py-2 text-sm no-underline">
          Gestionar usuarios
        </a>
      }
    />
  );
}
