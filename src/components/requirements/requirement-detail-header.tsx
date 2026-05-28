import Link from "next/link";
import type { ReactNode } from "react";
import { RequirementOwnerReassign } from "@/components/requirements/requirement-owner-reassign";
import { RequirementStatusChange } from "@/components/requirements/requirement-status-change";
import { StatusBadge, PriorityBadge } from "@/components/common/badges";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
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
  registerHoursHref,
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
  registerHoursHref: string;
}) {
  const metaSegments: { label: string; node: ReactNode }[] = [
    { label: "Cliente", node: clientName },
  ];

  if (contractLabel && effectiveContractId) {
    metaSegments.push({
      label: "Contrato",
      node: (
        <Link href={`/budgets/${effectiveContractId}`} className="text-primary hover:underline">
          {contractLabel}
        </Link>
      ),
    });
  }

  if (origin) {
    metaSegments.push({ label: "Origen", node: origin });
  }

  metaSegments.push({ label: "Creado", node: formatDateTime(createdAt) });

  if (completedAt) {
    metaSegments.push({ label: "Completado", node: formatDateTime(completedAt) });
  }

  return (
    <section className="surface-card flex flex-col gap-3 p-[length:var(--density-inset-pad)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} label={statusLabel} color={statusColor} />
            <PriorityBadge priority={priority} label={priorityLabel} color={priorityColor} />
            {canChangeStatus ? (
              <RequirementStatusChange
                requirementId={requirementId}
                currentStatus={status}
                statusOptions={statusOptions}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="inline-flex flex-wrap items-center gap-2 [&_div.mt-2]:mt-0">
              <span className="text-muted-foreground">Responsable:</span>
              <RequirementOwnerReassign
                requirementId={requirementId}
                requirementTitle={requirementTitle}
                currentOwnerId={ownerId}
                owners={owners}
                canWrite={canReassignOwner}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {editAction}
          <Link href={registerHoursHref} className="btn-primary py-2 text-sm no-underline">
            + Registrar horas
          </Link>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground">
        {metaSegments.map((segment, index) => (
          <span key={segment.label}>
            {index > 0 ? <span className="text-muted-foreground/60"> · </span> : null}
            <span className="text-muted-foreground">{segment.label}:</span> {segment.node}
          </span>
        ))}
      </p>

      {notes ? (
        <details className="rounded-[2px] border border-border/70 bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">Notas del requerimiento</summary>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{notes}</p>
        </details>
      ) : null}
    </section>
  );
}
