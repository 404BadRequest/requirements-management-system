"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Mail } from "lucide-react";
import { DataTable } from "@/components/common/data-table";
import { KpiCard } from "@/components/common/kpi-card";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { UtilizationPanel } from "@/components/reports/utilization-panel";
import { requirementDetailPath } from "@/lib/routes/requirements";
import type { Role } from "@/types/domain";

export type TeamMemberOpenRequirementRow = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  statusLabel: string;
  statusColor: string | null;
  priority: string;
  priorityLabel: string;
  priorityColor: string | null;
};

export type TeamMemberRecentEntryRow = {
  id: string;
  date: string;
  timeRange: string;
  hoursDisplay: string;
  requirementTitle: string | null;
};

export function TeamMemberProfile({
  memberId,
  memberName,
  memberEmail,
  memberRole,
  activeLabel,
  profileLabel,
  rateLabel,
  from,
  to,
  periodHours,
  periodHoursDisplay,
  utilizationPercent,
  openReqsCount,
  lastEntryLabel,
  capacityHours,
  weeklyCapacityHours,
  profileNameForUtilization,
  openRequirements,
  recentEntries,
  canRegisterHours,
}: {
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberRole: Role;
  activeLabel: string;
  profileLabel: string;
  rateLabel: string;
  from: string;
  to: string;
  periodHours: number;
  periodHoursDisplay: string;
  utilizationPercent: number;
  openReqsCount: number;
  lastEntryLabel: string;
  capacityHours: number;
  weeklyCapacityHours: number;
  profileNameForUtilization: string;
  openRequirements: TeamMemberOpenRequirementRow[];
  recentEntries: TeamMemberRecentEntryRow[];
  canRegisterHours: boolean;
}) {
  const router = useRouter();

  const openReqColumns: ColumnDef<TeamMemberOpenRequirementRow>[] = [
    {
      accessorKey: "title",
      header: "Requerimiento",
      cell: ({ row }) => (
        <Link href={requirementDetailPath(row.original.id)} className="font-medium hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    { accessorKey: "clientName", header: "Cliente" },
    {
      accessorKey: "statusLabel",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={row.original.statusLabel} color={row.original.statusColor} />,
    },
    {
      accessorKey: "priorityLabel",
      header: "Prioridad",
      cell: ({ row }) => (
        <PriorityBadge priority={row.original.priority} label={row.original.priorityLabel} color={row.original.priorityColor} />
      ),
    },
  ];

  const recentEntryColumns: ColumnDef<TeamMemberRecentEntryRow>[] = [
    {
      accessorKey: "id",
      header: "Hora",
      cell: ({ row }) => (
        <Link href={`/time-entries/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.id}
        </Link>
      ),
    },
    { accessorKey: "date", header: "Fecha" },
    { accessorKey: "timeRange", header: "Bloque" },
    {
      accessorKey: "hoursDisplay",
      header: "Horas",
      meta: { align: "right" },
    },
    {
      accessorKey: "requirementTitle",
      header: "Requerimiento",
      cell: ({ row }) => <span className="min-w-0 truncate">{row.original.requirementTitle ?? "—"}</span>,
    },
  ];

  const utilizationData = [
    {
      userId: memberId,
      userName: memberName,
      role: profileNameForUtilization,
      loggedHours: periodHours,
      capacityHours,
    },
  ];

  const hoursHref = `/time-entries?userId=${encodeURIComponent(memberId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const reqsHref = `/requirements?ownerId=${encodeURIComponent(memberId)}`;
  const registerHref = `/time-entries?nueva=1&userId=${encodeURIComponent(memberId)}`;

  return (
    <div className="space-y-6">
      <div className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <UserAvatar name={memberName} />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => router.push(`/team?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)}
                className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Volver al equipo
              </button>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{memberName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{memberEmail}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{memberRole}</span>
                <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{profileLabel}</span>
                <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{rateLabel}</span>
                <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{activeLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={hoursHref} className="btn-secondary py-2 text-sm no-underline">
              Ver horas del periodo
            </Link>
            <Link href={reqsHref} className="btn-secondary py-2 text-sm no-underline">
              Ver REQs abiertos
            </Link>
            {canRegisterHours ? (
              <Link href={registerHref} className="btn-primary py-2 text-sm no-underline">
                Registrar hora
              </Link>
            ) : null}
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1.5 py-2 text-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(memberEmail);
                  toast.success("Correo copiado al portapapeles");
                } catch {
                  toast.error("No se pudo copiar el correo");
                }
              }}
            >
              <Mail className="h-4 w-4" aria-hidden />
              Copiar correo
            </button>
          </div>
        </div>
      </div>

      <form className="surface-card flex flex-wrap items-end gap-4 p-[length:var(--density-inset-pad)]" action={`/team/${memberId}`} method="get">
        <div className="flex min-w-[9rem] flex-col gap-2">
          <label htmlFor="member-from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Desde
          </label>
          <input id="member-from" name="from" type="date" defaultValue={from} className="field-control w-full" />
        </div>
        <div className="flex min-w-[9rem] flex-col gap-2">
          <label htmlFor="member-to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hasta
          </label>
          <input id="member-to" name="to" type="date" defaultValue={to} className="field-control w-full" />
        </div>
        <button type="submit" className="btn-primary py-2 text-sm">
          Aplicar periodo
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Horas registradas" value={periodHoursDisplay} helper={`${from} → ${to}`} />
        <KpiCard label="Utilización" value={`${utilizationPercent}%`} helper={`Capacidad del periodo: ${capacityHours} h`} />
        <KpiCard label="REQs abiertos" value={String(openReqsCount)} helper="Como responsable" />
        <KpiCard label="Última imputación" value={lastEntryLabel} helper="Fecha más reciente registrada" />
      </div>

      <UtilizationPanel data={utilizationData} weeklyCapacityHours={weeklyCapacityHours} />

      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Requerimientos abiertos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Requerimientos donde {memberName} es responsable.</p>
        <div className="mt-4">
          <DataTable
            data={openRequirements}
            columns={openReqColumns}
            pageSize={10}
            globalFilterPlaceholder="Buscar requerimientos…"
            emptyTitle="Sin requerimientos abiertos"
            emptyDescription="No hay requerimientos activos asignados a esta persona."
          />
        </div>
      </section>

      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Horas recientes</h2>
        <p className="mt-1 text-sm text-muted-foreground">Últimas imputaciones en el periodo seleccionado.</p>
        <div className="mt-4">
          <DataTable
            data={recentEntries}
            columns={recentEntryColumns}
            pageSize={10}
            globalFilterPlaceholder="Buscar horas…"
            emptyTitle="Sin horas en el periodo"
            emptyDescription="No hay imputaciones registradas para este rango de fechas."
          />
        </div>
      </section>
    </div>
  );
}
