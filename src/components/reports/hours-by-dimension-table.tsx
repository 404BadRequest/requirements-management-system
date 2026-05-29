"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/data-table";
import type {
  HoursByProfileRow,
  HoursByProjectRow,
  HoursByUserRow,
} from "@/lib/reports/hours-aggregations";

type Dimension = "profile" | "user" | "project";

export function HoursByDimensionTable({
  dimension,
  profileRows,
  userRows,
  projectRows,
}: {
  dimension: Dimension;
  profileRows: HoursByProfileRow[];
  userRows: HoursByUserRow[];
  projectRows: HoursByProjectRow[];
}) {
  const profileColumns = useMemo<ColumnDef<HoursByProfileRow>[]>(
    () => [
      { accessorKey: "profileName", header: "Perfil" },
      {
        accessorKey: "hoursDisplay",
        header: "Horas",
        meta: { align: "right" },
      },
      {
        accessorKey: "sharePercentDisplay",
        header: "% del total",
        meta: { align: "right" },
      },
      {
        accessorKey: "distinctPeople",
        header: "Personas",
        meta: { align: "right" },
      },
      {
        accessorKey: "billableHoursDisplay",
        header: "Horas facturables",
        meta: { align: "right" },
      },
    ],
    [],
  );

  const userColumns = useMemo<ColumnDef<HoursByUserRow>[]>(
    () => [
      {
        accessorKey: "userName",
        header: "Persona",
        cell: ({ row }) => (
          <Link href={`/team/${row.original.userId}`} className="font-medium text-primary hover:underline">
            {row.original.userName}
          </Link>
        ),
      },
      { accessorKey: "profileName", header: "Perfil" },
      {
        accessorKey: "hoursDisplay",
        header: "Horas",
        meta: { align: "right" },
      },
      {
        accessorKey: "sharePercentDisplay",
        header: "% del total",
        meta: { align: "right" },
      },
      { accessorKey: "topCategories", header: "Categorías principales" },
    ],
    [],
  );

  const projectColumns = useMemo<ColumnDef<HoursByProjectRow>[]>(
    () => [
      { accessorKey: "projectCode", header: "Código" },
      { accessorKey: "projectName", header: "Proyecto" },
      { accessorKey: "clientName", header: "Cliente" },
      {
        accessorKey: "hoursDisplay",
        header: "Horas",
        meta: { align: "right" },
      },
      {
        accessorKey: "sharePercentDisplay",
        header: "% del total",
        meta: { align: "right" },
      },
      {
        accessorKey: "requirementCount",
        header: "REQs",
        meta: { align: "right" },
      },
      {
        accessorKey: "distinctPeople",
        header: "Personas",
        meta: { align: "right" },
      },
    ],
    [],
  );

  if (dimension === "profile") {
    return (
      <DataTable
        data={profileRows}
        columns={profileColumns}
        globalFilterPlaceholder="Buscar perfil…"
        pageSize={25}
        emptyTitle="Sin horas por perfil"
        emptyDescription="Amplía el periodo o quita filtros para ver agregaciones."
      />
    );
  }

  if (dimension === "user") {
    return (
      <DataTable
        data={userRows}
        columns={userColumns}
        globalFilterPlaceholder="Buscar persona…"
        pageSize={25}
        emptyTitle="Sin horas por persona"
        emptyDescription="Amplía el periodo o quita filtros para ver agregaciones."
      />
    );
  }

  return (
    <DataTable
      data={projectRows}
      columns={projectColumns}
      globalFilterPlaceholder="Buscar proyecto…"
      pageSize={25}
      emptyTitle="Sin horas por proyecto"
      emptyDescription="Amplía el periodo o quita filtros para ver agregaciones."
    />
  );
}
