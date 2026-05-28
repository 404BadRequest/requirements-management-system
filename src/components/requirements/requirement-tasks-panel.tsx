"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createRequirementTaskAction,
  cycleRequirementTaskStatusAction,
  deleteRequirementTaskAction,
  updateRequirementTaskAction,
} from "@/app/requirements/tasks-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SettingsModal } from "@/components/settings/settings-modal";
import { cn } from "@/lib/utils/cn";
import type { RequirementTask, RequirementTaskStatus } from "@/types/domain";

const STATUS_LABELS: Record<RequirementTaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Completada",
};

const STATUS_CLASSES: Record<RequirementTaskStatus, { dot: string; bg: string; text: string }> = {
  pending: {
    dot: "bg-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    text: "text-slate-600 dark:text-slate-400",
  },
  in_progress: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-800 dark:text-blue-300",
  },
  done: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-300",
  },
};

function TaskStatusBadge({
  status,
  onClick,
  disabled,
}: {
  status: RequirementTaskStatus;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const v = STATUS_CLASSES[status];
  const content = (
    <span className={cn("status-chip", v.bg, v.text)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.dot)} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
  if (!onClick) return content;
  return (
    <button
      type="button"
      className="rounded-[2px] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      disabled={disabled}
      title="Clic para cambiar estado"
    >
      {content}
    </button>
  );
}

function TaskFormFields({
  title,
  description,
  status,
  estimatedHours,
  onTitle,
  onDescription,
  onStatus,
  onEstimatedHours,
  stacked = false,
}: {
  title: string;
  description: string;
  status: RequirementTaskStatus;
  estimatedHours: string;
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
  onStatus: (v: RequirementTaskStatus) => void;
  onEstimatedHours: (v: string) => void;
  stacked?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="field-label">Título</span>
        <input
          className="field-control text-sm"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Ej. Incorporar registro en base de datos"
          maxLength={500}
          required
        />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Descripción (opcional)</span>
        <textarea
          className="field-control min-h-[4rem] text-sm"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Detalle adicional de la tarea"
          rows={3}
        />
      </label>
      <div className={cn("grid gap-3", stacked ? "grid-cols-1" : "sm:grid-cols-2")}>
        <label className="grid gap-1.5">
          <span className="field-label">Estado</span>
          <select className="field-control text-sm" value={status} onChange={(e) => onStatus(e.target.value as RequirementTaskStatus)}>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En curso</option>
            <option value="done">Completada</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="field-label">Horas estimadas</span>
          <input
            className="field-control text-sm"
            type="number"
            min={0}
            step={0.25}
            value={estimatedHours}
            onChange={(e) => onEstimatedHours(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      </div>
    </div>
  );
}

export function RequirementTasksPanel({
  requirementId,
  initialTasks,
  canManage = true,
  embedded = false,
  sidebar = false,
}: {
  requirementId: string;
  initialTasks: RequirementTask[];
  canManage?: boolean;
  embedded?: boolean;
  sidebar?: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RequirementTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RequirementTask | null>(null);
  const [pending, startTransition] = useTransition();

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<RequirementTaskStatus>("pending");
  const [newEstimatedHours, setNewEstimatedHours] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<RequirementTaskStatus>("pending");
  const [editEstimatedHours, setEditEstimatedHours] = useState("");

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [tasks],
  );

  const doneCount = sortedTasks.filter((t) => t.status === "done").length;
  const progressPct = sortedTasks.length > 0 ? Math.round((doneCount / sortedTasks.length) * 100) : 0;
  const totalEstimatedHours = sortedTasks.reduce((acc, t) => acc + (t.estimatedHours ?? 0), 0);

  const openEdit = (task: RequirementTask) => {
    setEditTarget(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditStatus(task.status);
    setEditEstimatedHours(task.estimatedHours != null ? String(task.estimatedHours) : "");
  };

  const handleCreate = () => {
    if (!newTitle.trim() || pending) return;
    const fd = new FormData();
    fd.set("title", newTitle.trim());
    fd.set("description", newDescription.trim());
    fd.set("status", newStatus);
    fd.set("estimatedHours", newEstimatedHours.trim());
    startTransition(async () => {
      try {
        await createRequirementTaskAction(requirementId, fd);
        toast.success("Tarea creada");
        setNewTitle("");
        setNewDescription("");
        setNewStatus("pending");
        setNewEstimatedHours("");
        setShowAddForm(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo crear la tarea.");
      }
    });
  };

  const handleUpdate = () => {
    if (!editTarget || !editTitle.trim() || pending) return;
    startTransition(async () => {
      try {
        await updateRequirementTaskAction(editTarget.id, requirementId, {
          title: editTitle.trim(),
          description: editDescription.trim(),
          status: editStatus,
          estimatedHours: editEstimatedHours.trim() ? Number(editEstimatedHours.replace(",", ".")) : null,
        });
        toast.success("Tarea actualizada");
        setEditTarget(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar la tarea.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget || pending) return;
    startTransition(async () => {
      try {
        await deleteRequirementTaskAction(deleteTarget.id, requirementId);
        toast.success("Tarea eliminada");
        setDeleteTarget(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar la tarea.");
      }
    });
  };

  const handleCycleStatus = (task: RequirementTask) => {
    if (!canManage || pending) return;
    const nextStatus: RequirementTaskStatus =
      task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "done" : "pending";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    startTransition(async () => {
      try {
        await cycleRequirementTaskStatusAction(task.id, requirementId);
        router.refresh();
      } catch (e) {
        setTasks(initialTasks);
        toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
      }
    });
  };

  return (
    <article className={cn(embedded || sidebar ? "min-w-0" : "surface-card overflow-hidden p-[length:var(--density-inset-pad)]")}>
      {!sidebar ? (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", embedded ? "mb-3" : "mb-4 border-b border-border/60 pb-4")}>
          <div>
            {!embedded ? (
              <>
                <h2 className="text-base font-semibold tracking-tight text-foreground">Plan de trabajo</h2>
                <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
                  Descompone el requerimiento en actividades menores para ejecutarlo de forma ordenada.
                </p>
              </>
            ) : (
              <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                Actividades del requerimiento en orden de ejecución.
              </p>
            )}
          </div>
          {sortedTasks.length > 0 ? (
            <div className="text-right text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                {doneCount}/{sortedTasks.length} completadas
                {totalEstimatedHours > 0 ? ` · ${totalEstimatedHours.toFixed(2)} h est.` : ""}
              </p>
              <div className="mt-1.5 h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      ) : sortedTasks.length > 0 ? (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">
              {doneCount}/{sortedTasks.length} completadas
            </span>
            {totalEstimatedHours > 0 ? (
              <span className="text-muted-foreground">{totalEstimatedHours.toFixed(2)} h est.</span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ) : null}

      {sortedTasks.length === 0 && !showAddForm ? (
        <p className={cn("text-sm text-muted-foreground", sidebar ? "mb-3" : "mb-4")}>
          Aún no hay tareas definidas para este requerimiento.
          {canManage ? " Agrega la primera actividad del plan de trabajo." : ""}
        </p>
      ) : null}

      {sortedTasks.length > 0 ? (
        sidebar ? (
          <ul className="space-y-2.5">
          {sortedTasks.map((task, index) => (
            <li key={task.id} className="rounded-[2px] border border-border/70 bg-muted/15 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">#{index + 1}</span>
                {canManage ? (
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      className="rounded-[2px] p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      onClick={() => openEdit(task)}
                      disabled={pending}
                      aria-label="Editar tarea"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-[2px] p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(task)}
                      disabled={pending}
                      aria-label="Eliminar tarea"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
              {task.description ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <TaskStatusBadge
                  status={task.status}
                  onClick={canManage ? () => handleCycleStatus(task) : undefined}
                  disabled={pending}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {task.estimatedHours != null ? `${task.estimatedHours.toFixed(2)} h est.` : "Sin horas est."}
                </span>
              </div>
            </li>
          ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-2 py-2">#</th>
                <th className="px-2 py-2">Tarea</th>
                <th className="w-32 px-2 py-2">Estado</th>
                <th className="w-24 px-2 py-2 text-right">Horas</th>
                {canManage ? <th className="w-20 px-2 py-2 text-right">Acc.</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task, index) => (
                <tr key={task.id} className="border-b border-border/50 last:border-0">
                  <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-2.5">
                    <p className="font-medium text-foreground">{task.title}</p>
                    {task.description ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5">
                    <TaskStatusBadge
                      status={task.status}
                      onClick={canManage ? () => handleCycleStatus(task) : undefined}
                      disabled={pending}
                    />
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                    {task.estimatedHours != null ? `${task.estimatedHours.toFixed(2)} h` : "—"}
                  </td>
                  {canManage ? (
                    <td className="px-2 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-[2px] p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          onClick={() => openEdit(task)}
                          disabled={pending}
                          aria-label="Editar tarea"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-[2px] p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(task)}
                          disabled={pending}
                          aria-label="Eliminar tarea"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )
      ) : null}

      {canManage && showAddForm ? (
        <div className={cn("rounded-[2px] border border-border bg-muted/20 p-4", sidebar ? "mt-3" : "mt-4")}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Nueva tarea</h3>
          <TaskFormFields
            title={newTitle}
            description={newDescription}
            status={newStatus}
            estimatedHours={newEstimatedHours}
            onTitle={setNewTitle}
            onDescription={setNewDescription}
            onStatus={setNewStatus}
            onEstimatedHours={setNewEstimatedHours}
            stacked={sidebar}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-1.5 text-xs" onClick={handleCreate} disabled={pending || !newTitle.trim()}>
              {pending ? "Guardando…" : "Guardar tarea"}
            </button>
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => {
                setShowAddForm(false);
                setNewTitle("");
                setNewDescription("");
                setNewStatus("pending");
                setNewEstimatedHours("");
              }}
              disabled={pending}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {canManage && !showAddForm ? (
        <button
          type="button"
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5 rounded-[2px] border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary",
            sidebar ? "mt-3" : "mt-4",
          )}
          onClick={() => setShowAddForm(true)}
          disabled={pending}
        >
          <Plus className="h-4 w-4" />
          Agregar tarea
        </button>
      ) : null}

      <SettingsModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar tarea"
        description="Actualiza los datos de la actividad del plan de trabajo."
      >
        <TaskFormFields
          title={editTitle}
          description={editDescription}
          status={editStatus}
          estimatedHours={editEstimatedHours}
          onTitle={setEditTitle}
          onDescription={setEditDescription}
          onStatus={setEditStatus}
          onEstimatedHours={setEditEstimatedHours}
          stacked={sidebar}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary py-1.5 text-xs" onClick={handleUpdate} disabled={pending || !editTitle.trim()}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setEditTarget(null)} disabled={pending}>
            Cancelar
          </button>
        </div>
      </SettingsModal>

      {deleteTarget ? (
        <ConfirmDialog
          label="Eliminar"
          title={`¿Eliminar «${deleteTarget.title}»? Esta acción no se puede deshacer.`}
          open
          confirmLabel="Eliminar"
          confirmLoadingLabel="Eliminando..."
          disabled={pending}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
          onConfirm={handleDelete}
        />
      ) : null}
    </article>
  );
}
