/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge, statusColor, priorityColor } from "@/components/common/badges";
import { updateRequirementAction } from "@/app/requirements/data-actions";
import { requirementDetailPath } from "@/lib/routes/requirements";
import type { Requirement } from "@/types/domain";

function normalizeStatusToken(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function KanbanCard({
  item,
  statusIndex,
  statusColumns,
  canManageStatus,
  pending,
  onMove,
  onDragStart,
  ownerName,
}: {
  item: Requirement;
  statusIndex: number;
  statusColumns: { code: string; label: string }[];
  canManageStatus: boolean;
  pending: boolean;
  onMove: (requirementId: string, nextStatusCode: string) => void;
  onDragStart: (requirementId: string) => void;
  ownerName: string;
}) {
  const borderColor = priorityColor(item.priority);
  const hasPrev = statusIndex > 0;
  const hasNext = statusIndex < statusColumns.length - 1;

  return (
    <article
      className="group block rounded-[2px] border border-border bg-background transition-all hover:border-border hover:shadow-soft"
      style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
      draggable={canManageStatus && !pending}
      onDragStart={() => onDragStart(item.id)}
    >
      <div className="px-3 py-2.5 space-y-2">
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
          {item.title}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <PriorityBadge priority={item.priority} />
          <Link href={requirementDetailPath(item.id)} className="font-mono text-[10px] text-primary hover:underline truncate max-w-[7rem]">
            {item.id}
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">Responsable: {ownerName}</p>
        {canManageStatus ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary inline-flex h-7 items-center gap-1 px-2 text-[11px]"
              disabled={!hasPrev || pending}
              onClick={() => {
                if (!hasPrev) return;
                onMove(item.id, statusColumns[statusIndex - 1].code);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Anterior
            </button>
            {pending ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Guardando...
              </span>
            ) : null}
            <button
              type="button"
              className="btn-secondary inline-flex h-7 items-center gap-1 px-2 text-[11px]"
              disabled={!hasNext || pending}
              onClick={() => {
                if (!hasNext) return;
                onMove(item.id, statusColumns[statusIndex + 1].code);
              }}
            >
              Siguiente
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ColumnEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2px] border border-dashed border-border bg-muted/20 px-3 py-6 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/30" aria-hidden />
      <p className="text-xs text-muted-foreground">Sin requerimientos</p>
    </div>
  );
}

export const RequirementKanbanBoard = ({
  requirements: initialRequirements,
  statusColumns,
  canManageStatus,
  ownerOptions,
  readOnly = false,
}: {
  requirements: Requirement[];
  statusColumns: { code: string; label: string }[];
  canManageStatus: boolean;
  ownerOptions: { id: string; name: string }[];
  readOnly?: boolean;
}) => {
  const [requirements, setRequirements] = useState(initialRequirements);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedStatusCodes, setSelectedStatusCodes] = useState<string[]>(statusColumns.map((status) => status.code));

  const statusCodeByToken = useMemo(() => {
    const map = new Map<string, string>();
    for (const status of statusColumns) {
      map.set(normalizeStatusToken(status.code), status.code);
      map.set(normalizeStatusToken(status.label), status.code);
    }
    return map;
  }, [statusColumns]);

  const ownerNameById = useMemo(() => new Map(ownerOptions.map((owner) => [owner.id, owner.name])), [ownerOptions]);

  const filteredRequirements = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return requirements.filter((item) => {
      if (ownerFilter && item.ownerId !== ownerFilter) return false;
      if (priorityFilter && item.priority !== priorityFilter) return false;
      if (query) {
        const ownerName = ownerNameById.get(item.ownerId)?.toLowerCase() ?? "";
        const searchable = `${item.id} ${item.title} ${item.description} ${ownerName}`;
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }, [ownerFilter, ownerNameById, priorityFilter, requirements, searchText]);

  const visibleStatusColumns = useMemo(
    () => statusColumns.filter((status) => selectedStatusCodes.includes(status.code)),
    [selectedStatusCodes, statusColumns],
  );

  const countsByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const status of statusColumns) map.set(status.code, 0);
    for (const req of filteredRequirements) {
      const resolvedCode = statusCodeByToken.get(normalizeStatusToken(req.status)) ?? req.status;
      map.set(resolvedCode, (map.get(resolvedCode) ?? 0) + 1);
    }
    return map;
  }, [filteredRequirements, statusCodeByToken, statusColumns]);

  async function moveRequirement(requirementId: string, nextStatusCode: string) {
    const current = requirements.find((item) => item.id === requirementId);
    if (!current || current.status === nextStatusCode) return;
    setSavingId(requirementId);
    const previousStatus = current.status;
    setRequirements((prev) => prev.map((row) => (row.id === requirementId ? { ...row, status: nextStatusCode } : row)));
    try {
      await updateRequirementAction(requirementId, { status: nextStatusCode });
      toast.success("Estado actualizado.");
    } catch (error) {
      setRequirements((prev) => prev.map((row) => (row.id === requirementId ? { ...row, status: previousStatus } : row)));
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar estado.");
    } finally {
      setSavingId(null);
      setDraggingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {canManageStatus && !readOnly ? (
        <p className="text-xs text-muted-foreground">
          Interacciones habilitadas: arrastra tarjetas entre columnas o usa Anterior/Siguiente para mover estado.
        </p>
      ) : null}
      {!readOnly && (
        <div className="surface-card mb-3 p-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1.5">
              <span className="field-label">Buscar</span>
              <input
                className="field-control"
                placeholder="ID, título, descripción, responsable..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">Responsable</span>
              <select className="field-control" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="">Todos</option>
                {ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">Prioridad</span>
              <select className="field-control" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="">Todas</option>
                {Array.from(new Set(requirements.map((item) => item.priority)))
                  .sort((a, b) => a.localeCompare(b, "es"))
                  .map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="btn-secondary h-10 px-3 text-sm"
                onClick={() => {
                  setSearchText("");
                  setOwnerFilter("");
                  setPriorityFilter("");
                  setSelectedStatusCodes(statusColumns.map((status) => status.code));
                }}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-[2px] border border-border/70 bg-muted/15 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estados visibles</p>
            <div className="flex flex-wrap gap-2">
              {statusColumns.map((status) => {
                const checked = selectedStatusCodes.includes(status.code);
                return (
                  <label key={status.code} className="inline-flex items-center gap-2 rounded-[2px] border border-border bg-background px-2.5 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked && selectedStatusCodes.length === 1) {
                          toast.info("Debes mantener al menos un estado visible.");
                          return;
                        }
                        setSelectedStatusCodes((prev) =>
                          checked ? prev.filter((code) => code !== status.code) : [...prev, status.code],
                        );
                      }}
                    />
                    {status.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {visibleStatusColumns.map((status, idx) => {
          const columnItems = filteredRequirements.filter((item) => {
            const resolvedCode = statusCodeByToken.get(normalizeStatusToken(item.status)) ?? item.status;
            return resolvedCode === status.code;
          });
          const color = statusColor(status.code);
          return (
            <section
              key={status.code}
              className="flex min-w-0 flex-1 flex-col rounded-[2px] border border-border bg-card"
              style={{ borderTopColor: color, borderTopWidth: "3px" }}
              onDragOver={(event) => {
                if (!canManageStatus || readOnly) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                if (!canManageStatus || readOnly || !draggingId) return;
                event.preventDefault();
                void moveRequirement(draggingId, status.code);
              }}
            >
              <header className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                  <h3 className="text-sm font-semibold text-foreground">{status.label}</h3>
                </div>
                <span className="rounded-[2px] border border-border bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                  {countsByStatus.get(status.code) ?? columnItems.length}
                </span>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]" style={{ maxHeight: readOnly ? "600px" : "calc(100vh - 14rem)" }}>
                {columnItems.length === 0 ? (
                  <ColumnEmptyState />
                ) : (
                  columnItems.map((item) => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      statusIndex={idx}
                      statusColumns={visibleStatusColumns}
                      canManageStatus={canManageStatus && !readOnly}
                      pending={savingId === item.id}
                      ownerName={ownerNameById.get(item.ownerId) ?? item.ownerId}
                      onMove={(id, next) => {
                        void moveRequirement(id, next);
                      }}
                      onDragStart={(id) => setDraggingId(id)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
