"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Download, X, AlertCircle, CheckCircle2, FileSpreadsheet, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseTimeEntryFile, generateTimeEntryTemplate } from "@/lib/time-entry-import";
import type { TimeEntryImportRow, TimeEntryImportRowWithError } from "@/lib/time-entry-import";
import {
  bulkCreateTimeEntriesFromImportAction,
  loadNewTimeEntryFormData,
} from "@/app/time-entries/new/data-actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onImported: (createdCount: number) => void;
}

type Step = "upload" | "preview" | "result";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(minutes: number): string {
  if (minutes <= 0) return "0h 0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload",  label: "Subir archivo" },
    { id: "preview", label: "Previsualizar" },
    { id: "result",  label: "Resultado" },
  ];
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold border transition-colors ${
            i < idx ? "bg-primary border-primary text-primary-foreground"
              : i === idx ? "bg-primary/10 border-primary text-primary"
              : "bg-muted border-border text-muted-foreground"
          }`}>
            {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === idx ? "text-primary" : "text-muted-foreground"}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TimeEntriesBulkUploadModal({ onClose, onImported }: Props) {
  const [step, setStep]           = useState<Step>("upload");
  const [isDragging, setDragging] = useState(false);
  const [fileName, setFileName]   = useState<string | null>(null);
  const [valid, setValid]     = useState<TimeEntryImportRow[]>([]);
  const [invalid, setInvalid] = useState<TimeEntryImportRowWithError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; failed: number;
    errors: Array<{ row: number; taskDescription: string; error: string }>;
  } | null>(null);

  // Contexto seleccionado en el header
  const [defaultRequirementId, setDefaultRequirementId] = useState<string>("");
  const [defaultContractId, setDefaultContractId]       = useState<string>("");

  // Datos del formulario (cargados desde server action)
  const [requirements, setRequirements] = useState<{ id: string; title: string }[]>([]);
  const [contracts, setContracts]       = useState<{ id: string; clientId: string; label: string }[]>([]);
  const [formLoaded, setFormLoaded]     = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos de contexto al montar
  useEffect(() => {
    let cancelled = false;
    void loadNewTimeEntryFormData().then((data) => {
      if (cancelled) return;
      setRequirements(data.requirements);
      setContracts(data.contracts);
      setFormLoaded(true);
    }).catch(() => {
      if (!cancelled) setFormLoaded(true); // continuar sin datos
    });
    return () => { cancelled = true; };
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Formato no soportado. Usa .xlsx, .xls o .csv");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const result = parseTimeEntryFile(buffer);
        setValid(result.valid);
        setInvalid(result.invalid);
        setStep("preview");
      } catch {
        toast.error("No se pudo leer el archivo. Verifica el formato.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDownloadTemplate = () => {
    const blob = generateTimeEntryTemplate();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "plantilla-horas.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    try {
      const result = await bulkCreateTimeEntriesFromImportAction(valid, {
        defaultRequirementId: defaultRequirementId || null,
        defaultContractId:    defaultContractId || null,
      });
      setImportResult({ created: result.created, failed: result.failed, errors: result.errors });
      onImported(result.created);
      setStep("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar.");
    } finally {
      setImporting(false);
    }
  };

  const totalValidMinutes = valid.reduce((acc, r) => acc + r.durationMinutes, 0);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-2xl border border-border flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Carga masiva de horas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Importa registros de horas desde Excel o CSV</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-5 flex-1">
          <StepIndicator current={step} />

          {/* ── Paso 1: Subir ── */}
          {step === "upload" && (
            <div className="flex flex-col gap-5">
              {/* Contexto por defecto */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Contexto por defecto <span className="font-normal normal-case">(opcional — aplica a filas sin requerimiento especificado)</span>
                </p>
                {!formLoaded && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Cargando datos…
                  </div>
                )}
                {formLoaded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Requerimiento por defecto</label>
                      <select
                        value={defaultRequirementId}
                        onChange={(e) => setDefaultRequirementId(e.target.value)}
                        className="field-control w-full text-sm"
                      >
                        <option value="">Sin requerimiento por defecto</option>
                        {requirements.map((r) => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">Contrato por defecto</label>
                      <select
                        value={defaultContractId}
                        onChange={(e) => setDefaultContractId(e.target.value)}
                        className="field-control w-full text-sm"
                      >
                        <option value="">Sin contrato por defecto</option>
                        {contracts.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Zona de carga */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center gap-3 py-10 transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isDragging ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar · Excel (.xlsx, .xls) o CSV</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInput} className="hidden" />
              </div>

              {/* Plantilla */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Plantilla de horas</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Descarga la plantilla Excel con el formato correcto y ejemplos de carga semanal.
                  </p>
                </div>
                <button onClick={handleDownloadTemplate} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>

              {/* Columnas esperadas */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columnas esperadas</p>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { col: "Fecha",         req: true,  desc: "YYYY-MM-DD (ej. 2026-06-02)" },
                    { col: "Inicio",        req: true,  desc: "HH:mm (ej. 09:00)" },
                    { col: "Fin",           req: true,  desc: "HH:mm (ej. 11:30) — debe ser posterior al inicio" },
                    { col: "Descripción",   req: true,  desc: "Texto de la tarea (mín. 3 caracteres)" },
                    { col: "Requerimiento", req: false, desc: "Título exacto del requerimiento en el sistema" },
                    { col: "Categoría",     req: false, desc: "Proyecto · Carga · Operación · Error · Gestión del servicio · default: Proyecto" },
                    { col: "Observaciones", req: false, desc: "Texto libre adicional" },
                  ].map(({ col, req, desc }) => (
                    <div key={col} className="px-4 py-2 flex items-center gap-3 text-xs">
                      <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded shrink-0">{col}</code>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${req ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
                        {req ? "Requerido" : "Opcional"}
                      </span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Paso 2: Previsualizar ── */}
          {step === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                    {valid.length} fila{valid.length !== 1 ? "s" : ""} válida{valid.length !== 1 ? "s" : ""}
                    {totalValidMinutes > 0 && ` · ${fmtDuration(totalValidMinutes)} totales`}
                  </span>
                </div>
                {invalid.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {invalid.length} fila{invalid.length !== 1 ? "s" : ""} con errores (se omitirán)
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{fileName}</span>
              </div>

              {valid.length === 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">No se encontraron filas válidas. Revisa el archivo.</p>
                </div>
              )}

              {valid.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/50 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registros a importar</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wide">
                          <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                          <th className="px-3 py-2 text-center font-semibold">Inicio</th>
                          <th className="px-3 py-2 text-center font-semibold">Fin</th>
                          <th className="px-3 py-2 text-right font-semibold text-blue-600">Duración</th>
                          <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                          <th className="px-3 py-2 text-left font-semibold">Requerimiento</th>
                          <th className="px-3 py-2 text-left font-semibold">Cat.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valid.map((row, i) => (
                          <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.date}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{row.startTime}</td>
                            <td className="px-3 py-2 text-center tabular-nums">{row.endTime}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                              {fmtDuration(row.durationMinutes)}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground max-w-[180px] truncate">{row.taskDescription}</td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">
                              {row.requirementTitle || <span className="italic">Por defecto</span>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {invalid.length > 0 && (
                <details className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
                  <summary className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-xs font-semibold text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-100 transition-colors">
                    {invalid.length} fila{invalid.length !== 1 ? "s" : ""} con errores
                  </summary>
                  <div className="divide-y divide-amber-100 dark:divide-amber-900">
                    {invalid.map((row, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-xs">
                        <span className="font-medium text-foreground shrink-0">
                          {row.date || `Fila ${row.rowIndex + 2}`}
                        </span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {row.errors.map((e, j) => <li key={j} className="text-amber-700 dark:text-amber-400">{e}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ── Paso 3: Resultado ── */}
          {step === "result" && importResult && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                importResult.failed === 0 ? "bg-green-100 dark:bg-green-950/40" : "bg-amber-100 dark:bg-amber-950/40"
              }`}>
                {importResult.failed === 0
                  ? <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  : <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">
                  {importResult.failed === 0 ? "¡Importación completada!" : "Importación parcial"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.created} registro{importResult.created !== 1 ? "s" : ""} creado{importResult.created !== 1 ? "s" : ""}
                  {importResult.failed > 0 && ` · ${importResult.failed} fallaron`}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.created}</p>
                  <p className="text-xs text-muted-foreground">Creados</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.failed}</p>
                    <p className="text-xs text-muted-foreground">Fallaron</p>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <details className="w-full rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
                  <summary className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-xs font-semibold text-amber-700 dark:text-amber-300 cursor-pointer">
                    Ver errores
                  </summary>
                  <div className="divide-y divide-amber-100 dark:divide-amber-900">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-xs">
                        <span className="font-medium text-foreground shrink-0">Fila {e.row}: {e.taskDescription}</span>
                        <span className="text-amber-700 dark:text-amber-400">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
          {step === "upload" && (
            <>
              <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
              <p className="text-xs text-muted-foreground">Selecciona un archivo para continuar</p>
            </>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setFileName(null); setValid([]); setInvalid([]); }}
                className="btn-secondary text-sm"
              >
                Volver
              </button>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
                <button
                  onClick={handleImport}
                  disabled={valid.length === 0 || importing}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {importing ? "Importando…" : `Importar ${valid.length} registro${valid.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}
          {step === "result" && (
            <button onClick={onClose} className="btn-primary text-sm ml-auto">Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

// ─── Botón de apertura (para usar en server components) ───────────────────────

export function TimeEntriesBulkUploadButton({ onImportedCallback }: { onImportedCallback?: (count: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary py-2 text-sm inline-flex items-center gap-1.5"
      >
        <Upload className="h-3.5 w-3.5" />
        Carga masiva
      </button>
      {open && (
        <TimeEntriesBulkUploadModal
          onClose={() => setOpen(false)}
          onImported={(count) => {
            setOpen(false);
            onImportedCallback?.(count);
          }}
        />
      )}
    </>
  );
}
