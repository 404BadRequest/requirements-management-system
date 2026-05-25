"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { calcCubicacionRow, CUBICACION_DEFAULTS } from "@/lib/calculations/cubicacion";
import type { CubicacionItem } from "@/types/domain";

interface RequirementOption {
  id: string;
  title: string;
}

interface CubicacionFormValues {
  activityName: string;
  requirementId: string | null;
  construccionHours: number;
  levantamientoPct: number;
  disenoPct: number;
  qaAjustesPct: number;
  puestaEnMarchaPct: number;
  seniorPct: number;
  ingeneroPct: number;
  juniorPct: number;
}

interface CubicacionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: CubicacionFormValues) => Promise<void>;
  initialValues?: Partial<CubicacionItem>;
  requirements: RequirementOption[];
  title: string;
}

const DEFAULT_VALUES: CubicacionFormValues = {
  activityName: "",
  requirementId: null,
  construccionHours: 0,
  ...CUBICACION_DEFAULTS,
};

function PctInput({ id, label, value, onChange, disabled }: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          min={0}
          max={1}
          step={0.01}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="field-control w-20 tabular-nums text-sm"
        />
        <span className="text-xs text-muted-foreground">{(value * 100).toFixed(0)} %</span>
      </div>
    </div>
  );
}

export function CubicacionFormModal({ open, onClose, onSave, initialValues, requirements, title }: CubicacionFormModalProps) {
  const [values, setValues] = useState<CubicacionFormValues>(DEFAULT_VALUES);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues({
        activityName: initialValues?.activityName ?? "",
        requirementId: initialValues?.requirementId ?? null,
        construccionHours: initialValues?.construccionHours ?? 0,
        levantamientoPct: initialValues?.levantamientoPct ?? CUBICACION_DEFAULTS.levantamientoPct,
        disenoPct: initialValues?.disenoPct ?? CUBICACION_DEFAULTS.disenoPct,
        qaAjustesPct: initialValues?.qaAjustesPct ?? CUBICACION_DEFAULTS.qaAjustesPct,
        puestaEnMarchaPct: initialValues?.puestaEnMarchaPct ?? CUBICACION_DEFAULTS.puestaEnMarchaPct,
        seniorPct: initialValues?.seniorPct ?? CUBICACION_DEFAULTS.seniorPct,
        ingeneroPct: initialValues?.ingeneroPct ?? CUBICACION_DEFAULTS.ingeneroPct,
        juniorPct: initialValues?.juniorPct ?? CUBICACION_DEFAULTS.juniorPct,
      });
      setAdvancedOpen(false);
      setError(null);
    }
  }, [open, initialValues]);

  const set = <K extends keyof CubicacionFormValues>(key: K, val: CubicacionFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const preview = calcCubicacionRow(values);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.activityName.trim()) { setError("El nombre de la actividad es obligatorio."); return; }
    if (values.construccionHours <= 0) { setError("Las horas de construcción deben ser mayores a 0."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la actividad.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="fixed inset-0 bg-black/40" aria-hidden onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-[4px] border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            {/* Actividad y Requerimiento */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="activityName" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actividad <span className="text-danger">*</span>
                </label>
                <input
                  id="activityName"
                  type="text"
                  required
                  value={values.activityName}
                  onChange={(e) => set("activityName", e.target.value)}
                  placeholder="Ej: Banner en página de inicio"
                  className="field-control w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="requirementId" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requerimiento asociado
                </label>
                <select
                  id="requirementId"
                  value={values.requirementId ?? ""}
                  onChange={(e) => set("requirementId", e.target.value || null)}
                  className="field-control w-full"
                >
                  <option value="">Sin requerimiento</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="construccionHours" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Horas de construcción <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="construccionHours"
                    type="number"
                    min={0.01}
                    step={0.25}
                    required
                    value={values.construccionHours || ""}
                    onChange={(e) => set("construccionHours", Number(e.target.value))}
                    className="field-control w-28 tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                </div>
              </div>
            </div>

            {/* Preview calculado */}
            {values.construccionHours > 0 && (
              <div className="rounded-[4px] border border-border/60 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Desglose estimado</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {[
                    { label: "Levant.", value: preview.levantamiento },
                    { label: "Diseño", value: preview.diseno },
                    { label: "QA", value: preview.qaAjustes },
                    { label: "Puesta", value: preview.puestaEnMarcha },
                    { label: "TOTAL", value: preview.totalHoras, bold: true },
                    { label: "Senior", value: preview.seniorHoras },
                    { label: "Ing.", value: preview.ingenieroHoras },
                    { label: "Junior", value: preview.juniorHoras },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                      <span className={`tabular-nums text-sm ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value.toFixed(2)} h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Porcentajes avanzados */}
            <div className="border-t border-border/50 pt-3">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Ajustar porcentajes de fase y perfil
              </button>

              {advancedOpen && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fases del proyecto</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <PctInput id="pct-levantamiento" label="Levantamiento" value={values.levantamientoPct} onChange={(v) => set("levantamientoPct", v)} />
                      <PctInput id="pct-diseno" label="Diseño" value={values.disenoPct} onChange={(v) => set("disenoPct", v)} />
                      <PctInput id="pct-qa" label="QA + Ajustes" value={values.qaAjustesPct} onChange={(v) => set("qaAjustesPct", v)} />
                      <PctInput id="pct-puesta" label="Puesta en marcha" value={values.puestaEnMarchaPct} onChange={(v) => set("puestaEnMarchaPct", v)} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distribución por perfil</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <PctInput id="pct-senior" label="Ing. Senior" value={values.seniorPct} onChange={(v) => set("seniorPct", v)} />
                      <PctInput id="pct-ingeniero" label="Ingeniero" value={values.ingeneroPct} onChange={(v) => set("ingeneroPct", v)} />
                      <PctInput id="pct-junior" label="Ing. Junior" value={values.juniorPct} onChange={(v) => set("juniorPct", v)} />
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Las horas Junior = Total × {(values.juniorPct * 100).toFixed(0)} % − QA+Ajustes (el junior ejecuta el QA).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
