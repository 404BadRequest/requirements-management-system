import Link from "next/link";
import type { ReactNode } from "react";
import { RequirementOwnerReassign } from "@/components/requirements/requirement-owner-reassign";
import { RequirementStatusChange } from "@/components/requirements/requirement-status-change";
import { StatusBadge, PriorityBadge } from "@/components/common/badges";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{children}</dd>
    </div>
  );
}

export function RequirementDetailHeader({
  requirementId,
  requirementTitle,
  clientName,
  contractLabel,
  effectiveContractId,
  origin,
  createdAt,
  completedAt,
  notes,
  status,
  statusLabel,
  statusColor,
  priority,
  priorityLabel,
  priorityColor,
  ownerId,
  owners,
  canReassignOwner,
  canChangeStatus,
  statusOptions,
  editAction,
  registerHoursAction,
}: {
  requirementId: string;
  requirementTitle: string;
  clientName: string;
  contractLabel: string | null;
  effectiveContractId: string | null;
  origin: string | null;
  createdAt: string;
  completedAt: string | null;
  notes: string;
  status: string;
  statusLabel: string;
  statusColor: string | null;
  priority: string;
  priorityLabel: string;
  priorityColor: string | null;
  ownerId: string;
  owners: { id: string; name: string }[];
  canReassignOwner: boolean;
  canChangeStatus: boolean;
  statusOptions: { code: string; label: string }[];
  editAction: ReactNode;
  registerHoursAction: ReactNode;
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <PriorityBadge priority={priority} label={priorityLabel} color={priorityColor} />
          {canChangeStatus ? (
            <RequirementStatusChange
              requirementId={requirementId}
              currentStatus={status}
              statusOptions={statusOptions}
              compact
            />
          ) : (
            <StatusBadge status={status} label={statusLabel} color={statusColor} />
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {editAction}
          {registerHoursAction}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 bg-muted/20 px-5 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsable</span>
        <RequirementOwnerReassign
          requirementId={requirementId}
          requirementTitle={requirementTitle}
          currentOwnerId={ownerId}
          owners={owners}
          canWrite={canReassignOwner}
          compact
        />
      </div>

      <div className="space-y-4 px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          <MetaItem label="Cliente">{clientName}</MetaItem>
          {origin ? <MetaItem label="Origen">{origin}</MetaItem> : null}
          <MetaItem label="Creado">{formatDateTime(createdAt)}</MetaItem>
          {completedAt ? <MetaItem label="Completado">{formatDateTime(completedAt)}</MetaItem> : null}
        </dl>

        {contractLabel && effectiveContractId ? (
          <dl className="border-t border-border/50 pt-4">
            <MetaItem label="Contrato">
              <Link href={`/budgets/${effectiveContractId}`} className="text-primary hover:underline">
                {contractLabel}
              </Link>
            </MetaItem>
          </dl>
        ) : null}
      </div>

      {notes ? (
        <details className="border-t border-border/60 px-5 py-3.5">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">Notas del requerimiento</summary>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{notes}</p>
        </details>
      ) : null}
    </section>
  );
}
