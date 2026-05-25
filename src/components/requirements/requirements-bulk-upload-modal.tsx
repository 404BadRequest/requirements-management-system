"use client";

import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from "react";
import { Upload, Download, X, AlertCircle, CheckCircle2, FileSpreadsheet, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseRequirementFile, generateRequirementTemplate } from "@/lib/requirement-import";
import type { RequirementImportRow, RequirementImportRowWithError } from "@/lib/requirement-import";
import { bulkCreateRequirementsAction } from "@/app/requirements/data-actions";
import type { Requirement } from "@/types/domain";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ClientOption  { id: string; name: string; }
interface ContractOption { id: string; clientId: string; label: string; }

interface Props {
  clients:   ClientOption[];
  contracts: ContractOption[];
  onClose: () => void;
  onImported: (newRequirements: Requirement[]) => void;
}

type Step = "upload" | "preview" | "result";

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Por desarrollar",
  READY_FOR_QA: "Pasar a QA",
  QA_DONE: "Listo en QA",
  READY_FOR_PROD: "Pasar a producción",
  DONE_PROD: "Listo en producción",
  WONT_DO: "No desarrollar",
  CLIENT_VALIDATION: "Validar con cliente",
};

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

export function RequirementsBulkUploadModal({ clients, contracts, onClose, onImported }: Props) {
  const [step, setStep]           = useState<Step>("upload");
  const [isDragging, setDragging] = useState(false);
  const [fileName, setFileName]   = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId]     = useState<string>(clients[0]?.id ?? "");
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [valid, setValid]     = useState<RequirementImportRow[]>([]);
  const [invalid, setInvalid] = useState<RequirementImportRowWithError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; failed: number;
    errors: Array<{ title: string; error: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContracts = contracts.filter((c) => c.clientId === selectedClientId);

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
        const result = parseRequirementFile(buffer);
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
    const blob = generateRequirementTemplate();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "plantilla-requerimientos.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!selectedClientId || valid.length === 0) return;
    setImporting(true);
    try {
      const result = await bulkCreateRequirementsAction(
        selectedClientId,
        selectedContractId || null,
        valid,
      );
      setImportResult({ created: result.created, failed: result.failed, errors: result.errors });
      if (result.newRequirements.length > 0) onImported(result.newRequirements);
      setStep("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar.");
    } finally {
      setImporting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-2xl border border-border flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Carga masiva de requerimientos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Importa requerimientos desde Excel o CSV</p>
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
              {/* Selección de cliente/contrato */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Contexto de importación
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => { setSelectedClientId(e.target.value); setSelectedContractId(""); }}
                      className="field-control w-full text-sm"
                    >
                      <option value="">Seleccionar cliente…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Contrato <span className="text-muted-foreground">(opcional)</span>
                    </label>
                    <select
                      value={selectedContractId}
                      onChange={(e) => setSelectedContractId(e.target.value)}
                      disabled={!selectedClientId || filteredContracts.length === 0}
                      className="field-control w-full text-sm"
                    >
                      <option value="">Sin contrato específico</option>
                      {filteredContracts.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    o haz clic para seleccionar · Excel (.xlsx, .xls) o CSV
                  </p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInput} className="hidden" />
              </div>

              {/* Plantilla */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Plantilla de requerimientos</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Descarga la plantilla Excel con las columnas esperadas y ejemplos. Incluye una hoja de referencia con los valores válidos de prioridad y estado.
                  </p>
                </div>
                <button onClick={handleDownloadTemplate} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>

              {/* Columnas */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columnas esperadas</p>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { col: "Título",       req: true,  desc: "Nombre del requerimiento (mín. 3 caracteres)" },
                    { col: "Descripción",  req: false, desc: "Descripción detallada · default: mismo que Título" },
                    { col: "Origen",       req: false, desc: "Texto libre · default: Importación" },
                    { col: "Prioridad",    req: false, desc: "P0 – P6 · default: P2" },
                    { col: "Estado",       req: false, desc: "BACKLOG · READY_FOR_QA · QA_DONE · READY_FOR_PROD · DONE_PROD · WONT_DO · CLIENT_VALIDATION · default: BACKLOG" },
                    { col: "Notas",        req: false, desc: "Texto libre, observaciones adicionales" },
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
                  <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requerimientos a importar</p>
                    <p className="text-[11px] text-muted-foreground">
                      Cliente: <span className="font-medium">{clients.find((c) => c.id === selectedClientId)?.name}</span>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wide">
                          <th className="px-3 py-2 text-left font-semibold">Título</th>
                          <th className="px-3 py-2 text-left font-semibold">Origen</th>
                          <th className="px-3 py-2 text-center font-semibold">Prioridad</th>
                          <th className="px-3 py-2 text-left font-semibold">Estado</th>
                          <th className="px-3 py-2 text-left font-semibold">Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valid.map((row, i) => (
                          <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">{row.title}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.origin}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {row.priority}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{STATUS_LABELS[row.status] ?? row.status}</td>
                            <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">{row.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {invalid.length > 0 && (
                <details className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
                  <summary className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-xs font-semibold text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                    {invalid.length} fila{invalid.length !== 1 ? "s" : ""} con errores
                  </summary>
                  <div className="divide-y divide-amber-100 dark:divide-amber-900">
                    {invalid.map((row, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-xs">
                        <span className="font-medium text-foreground shrink-0">{row.title || `Fila ${row.rowIndex + 2}`}</span>
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
                  {importResult.created} requerimiento{importResult.created !== 1 ? "s" : ""} creado{importResult.created !== 1 ? "s" : ""}
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
                        <span className="font-medium text-foreground shrink-0">{e.title}</span>
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
              <p className="text-xs text-muted-foreground">
                {!selectedClientId ? "Selecciona un cliente antes de subir el archivo" : "Selecciona un archivo para continuar"}
              </p>
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
                  disabled={valid.length === 0 || !selectedClientId || importing}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {importing ? "Importando…" : `Importar ${valid.length} requerimiento${valid.length !== 1 ? "s" : ""}`}
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
