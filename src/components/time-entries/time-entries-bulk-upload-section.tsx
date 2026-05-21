"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importTimeEntriesCsvAction } from "@/app/time-entries/new/data-actions";

type BulkUploadResult = {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  rowErrors: Array<{ row: number; message: string }>;
};

export function TimeEntriesBulkUploadSection() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  async function handleFileChange(file: File | null) {
    if (!file) {
      setFileName("");
      setCsvText("");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Debes seleccionar un archivo CSV.");
      return;
    }
    setFileName(file.name);
    const content = await file.text();
    setCsvText(content);
    setResult(null);
  }

  async function handleUpload() {
    if (!csvText.trim()) {
      toast.error("Selecciona un CSV antes de cargar.");
      return;
    }
    setLoading(true);
    const loadingId = toast.loading("Procesando carga masiva...");
    try {
      const response = (await importTimeEntriesCsvAction({ csvText })) as BulkUploadResult;
      setResult(response);
      if (response.failedCount > 0) {
        toast.error(`Carga parcial: ${response.createdCount} exitosas, ${response.failedCount} con error.`, { id: loadingId });
      } else {
        toast.success(`Carga exitosa: ${response.createdCount} horas registradas.`, { id: loadingId });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo procesar el archivo.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface-card mb-4 p-[length:var(--density-inset-pad)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Carga masiva de horas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Funcionalidad avanzada para importar múltiples registros en lote.</p>
        </div>
        <button type="button" className="btn-secondary py-2 text-sm" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Ocultar carga masiva" : "Expandir carga masiva"}
        </button>
      </div>

      {open ? (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Descarga la plantilla CSV, completa las filas y luego carga el archivo para registrar múltiples horas.
            </p>
            <a href="/api/export/time-entries/template" className="btn-secondary inline-flex py-2 text-sm no-underline">
              Descargar plantilla CSV
            </a>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5">
              <span className="field-label">Archivo CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="field-control max-w-md text-sm"
                onChange={(event) => {
                  void handleFileChange(event.target.files?.[0] ?? null);
                }}
                disabled={loading}
              />
            </label>
            <button
              type="button"
              className="btn-primary py-2 text-sm"
              onClick={() => void handleUpload()}
              disabled={loading || !csvText.trim()}
            >
              {loading ? "Cargando..." : "Cargar horas masivas"}
            </button>
          </div>

          {fileName ? <p className="mt-2 text-xs text-muted-foreground">Archivo seleccionado: {fileName}</p> : null}
          <div className="mt-2 rounded-[2px] border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Formato esperado: <span className="font-medium text-foreground">date = YYYY-MM-DD</span>,{" "}
            <span className="font-medium text-foreground">startTime/endTime = HH:mm</span>. Deja vacío{" "}
            <span className="font-medium text-foreground">requirementId</span>,{" "}
            <span className="font-medium text-foreground">contractId</span> y{" "}
            <span className="font-medium text-foreground">contractProfileId</span> cuando no aplique.
          </div>

          {result ? (
            <div className="mt-3 rounded-[2px] border border-border bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">
                Resultado: {result.createdCount} creadas / {result.failedCount} con error (total filas: {result.totalRows})
              </p>
              {result.rowErrors.length > 0 ? (
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-danger">
                  {result.rowErrors.map((rowError) => (
                    <li key={`${rowError.row}-${rowError.message}`}>
                      Fila {rowError.row}: {rowError.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
