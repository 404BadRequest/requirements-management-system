"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/common/data-table";
import { UserAvatar } from "@/components/common/user-avatar";
import { RowActionMenu } from "@/components/common/row-action-menu";
import type { Role } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

export type TeamDirectoryRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileId: string;
  profileLabel: string;
  rateLabel: string;
  hours: number;
  hoursDisplay: string;
  estimateLabel: string;
  openReqsCount: number;
  utilizationPercent: number;
  utilizationDisplay: string;
  activeLabel: string;
  capacityHours: number;
};

function utilizationClass(percent: number): string {
  if (percent > 100) return "text-danger font-semibold";
  if (percent < 60) return "text-warning";
  return "text-success";
}

export function TeamDirectoryTable({
  rows,
  from,
  to,
}: {
  rows: TeamDirectoryRow[];
  from: string;
  to: string;
}) {
  const router = useRouter();
  const columns = useMemo<ColumnDef<TeamDirectoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Persona",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={row.original.name} />
            <Link href={`/team/${row.original.id}?from=${from}&to=${to}`} className="truncate font-medium hover:underline">
              {row.original.name}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ row }) => <span className="truncate text-muted-foreground">{row.original.email}</span>,
      },
      { accessorKey: "profileLabel", header: "Perfil" },
      {
        accessorKey: "hours",
        header: "Horas (periodo)",
        meta: { align: "right" },
        cell: ({ row }) => row.original.hoursDisplay,
      },
      {
        accessorKey: "openReqsCount",
        header: "REQs abiertos",
        meta: { align: "right" },
      },
      {
        accessorKey: "utilizationPercent",
        header: "Utilización",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className={cn("tabular-nums", utilizationClass(row.original.utilizationPercent))}>
            {row.original.utilizationDisplay}
          </span>
        ),
      },
      { accessorKey: "activeLabel", header: "Estado" },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        enableGlobalFilter: false,
        meta: { align: "right" },
        cell: ({ row }) => {
          const email = row.original.email;
          const hoursHref = `/time-entries?userId=${encodeURIComponent(row.original.id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
          const reqsHref = `/requirements?ownerId=${encodeURIComponent(row.original.id)}`;
          const profileHref = `/team/${row.original.id}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

          return (
            <RowActionMenu
              items={[
                { label: "Ver persona", onClick: () => router.push(profileHref) },
                { label: "Ver horas", onClick: () => router.push(hoursHref) },
                { label: "Ver REQs abiertos", onClick: () => router.push(reqsHref) },
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
    [from, to, router],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      globalFilterPlaceholder="Buscar por nombre, correo, perfil…"
      pageSize={20}
      emptyTitle="Sin personas"
      emptyDescription="No hay usuarios para el filtro actual o aún no existe directorio."
      emptyAction={
        <a href="/settings/users" className="btn-secondary py-2 text-sm no-underline">
          Gestionar usuarios
        </a>
      }
    />
  );
}
