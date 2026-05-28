"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRequirementAction } from "@/app/requirements/data-actions";
import { formatStatusLabel } from "@/lib/formatting/status-label";

export function RequirementStatusChange({
  requirementId,
  currentStatus,
  statusOptions,
  compact = false,
}: {
  requirementId: string;
  currentStatus: string;
  statusOptions: { code: string; label: string }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const hasChange = selected !== currentStatus;

  const handleSave = async () => {
    if (!hasChange || saving) return;
    setSaving(true);
    try {
      await updateRequirementAction(requirementId, { status: selected });
      toast.success("Estado actualizado");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
      setSelected(currentStatus);
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="inline-flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</span>
        <label className="sr-only" htmlFor={`req-status-${requirementId}`}>
          Cambiar estado
        </label>
        <select
          id={`req-status-${requirementId}`}
          className="field-control min-w-[11rem] py-1.5 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={saving}
        >
          {statusOptions.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {formatStatusLabel(opt.code, opt.label)}
            </option>
          ))}
        </select>
        {hasChange ? (
          <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Aplicar"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <select
        className="field-control w-full text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={saving}
      >
        {statusOptions.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {formatStatusLabel(opt.code, opt.label)}
          </option>
        ))}
      </select>
      {hasChange ? (
        <button type="button" className="btn-primary w-full py-1.5 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar estado"}
        </button>
      ) : null}
    </div>
  );
}
