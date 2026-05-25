/**
 * Utilidades para importación masiva de Horas (TimeEntry) desde Excel o CSV.
 */
import * as XLSX from "xlsx";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface TimeEntryImportRow {
  rowIndex: number;
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:mm
  endTime: string;      // HH:mm
  taskDescription: string;
  requirementTitle: string; // título para lookup (opcional)
  category: string;
  observations: string;
  /** minutos derivados de startTime y endTime */
  durationMinutes: number;
}

export interface TimeEntryImportRowWithError extends TimeEntryImportRow {
  errors: string[];
}

export interface TimeEntryImportResult {
  valid: TimeEntryImportRow[];
  invalid: TimeEntryImportRowWithError[];
  totalRows: number;
}

// ─── Alias de columnas ────────────────────────────────────────────────────────

const COLUMN_ALIASES: [keyof TimeEntryImportRow, string[]][] = [
  ["date",             ["fecha", "date", "dia", "día"]],
  ["startTime",        ["inicio", "start", "hora inicio", "horainicio", "starttime", "desde"]],
  ["endTime",          ["fin", "end", "hora fin", "horafin", "endtime", "hasta", "termino", "término"]],
  ["taskDescription",  ["descripcion", "descripción", "tarea", "task", "description", "actividad", "detalle"]],
  ["requirementTitle", ["requerimiento", "requirement", "req", "titulo req", "nombre req"]],
  ["category",         ["categoria", "categoría", "category", "tipo"]],
  ["observations",     ["observaciones", "observations", "notas", "notes", "comentarios"]],
];

const DEFAULT_CATEGORY = "Proyecto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectColumnMap(headers: string[]): Map<keyof TimeEntryImportRow, number> {
  const map = new Map<keyof TimeEntryImportRow, number>();
  for (const [key, aliases] of COLUMN_ALIASES) {
    const normAliases = aliases.map(normalize);
    const idx = headers.findIndex((h) => normAliases.includes(normalize(h)));
    if (idx !== -1) map.set(key, idx);
  }
  if (!map.has("date") && !map.has("startTime")) {
    map.set("date", 0);
    map.set("startTime", 1);
    map.set("endTime", 2);
    map.set("taskDescription", 3);
    map.set("requirementTitle", 4);
    map.set("category", 5);
    map.set("observations", 6);
  }
  return map;
}

function getCell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  const val = row[idx];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/** Normaliza fechas de Excel (número de serie) o string YYYY-MM-DD / DD-MM-YYYY */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Excel number serial
  const asNum = Number(raw);
  if (!isNaN(asNum) && asNum > 1000) {
    const date = XLSX.SSF.parse_date_code(asNum);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD-MM-YYYY
  const ddmm = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
  return null;
}

/** Normaliza tiempos: "8:30", "08:30", "8h30", "830" */
function parseTime(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[^0-9:]/g, ":");
  const parts = clean.split(":").filter(Boolean);
  if (parts.length === 2) {
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    if (Number(h) < 24 && Number(m) < 60) return `${h}:${m}`;
  }
  if (parts.length === 1 && parts[0].length <= 4) {
    const n = parts[0].padStart(4, "0");
    const h = n.slice(0, 2);
    const m = n.slice(2, 4);
    if (Number(h) < 24 && Number(m) < 60) return `${h}:${m}`;
  }
  return null;
}

function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseTimeEntryFile(buffer: ArrayBuffer): TimeEntryImportResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (raw.length === 0) return { valid: [], invalid: [], totalRows: 0 };

  const firstRowStrings = (raw[0] as unknown[]).map((c) => String(c ?? "").trim());
  const hasHeader = firstRowStrings.length > 0 && isNaN(Number(firstRowStrings[0])) && firstRowStrings[0] !== "";
  const headers = hasHeader ? firstRowStrings : firstRowStrings.map((_, i) => `col${i}`);
  const dataRows = hasHeader ? raw.slice(1) : raw;
  const colMap = detectColumnMap(headers);

  const valid: TimeEntryImportRow[] = [];
  const invalid: TimeEntryImportRowWithError[] = [];

  dataRows.forEach((row, rowIndexInData) => {
    const rowIndex = hasHeader ? rowIndexInData + 1 : rowIndexInData;
    const errors: string[] = [];

    const rawDate  = getCell(row as unknown[], colMap.get("date"));
    const rawStart = getCell(row as unknown[], colMap.get("startTime"));
    const rawEnd   = getCell(row as unknown[], colMap.get("endTime"));
    const rawDesc  = getCell(row as unknown[], colMap.get("taskDescription"));

    // Fila vacía
    if (!rawDate && !rawStart && !rawDesc) return;

    const date = parseDate(rawDate);
    if (!date) errors.push(`Fecha inválida: "${rawDate}". Usa formato YYYY-MM-DD.`);

    const startTime = parseTime(rawStart);
    if (!startTime) errors.push(`Hora de inicio inválida: "${rawStart}". Usa formato HH:mm.`);

    const endTime = parseTime(rawEnd);
    if (!endTime) errors.push(`Hora de fin inválida: "${rawEnd}". Usa formato HH:mm.`);

    let durationMinutes = 0;
    if (startTime && endTime) {
      durationMinutes = calcDuration(startTime, endTime);
      if (durationMinutes <= 0) {
        errors.push(`La hora de fin (${endTime}) debe ser posterior al inicio (${startTime}).`);
      }
    }

    if (!rawDesc || rawDesc.length < 3) {
      errors.push("La descripción de la tarea debe tener al menos 3 caracteres.");
    }

    const requirementTitle = getCell(row as unknown[], colMap.get("requirementTitle"));
    const category         = getCell(row as unknown[], colMap.get("category")) || DEFAULT_CATEGORY;
    const observations     = getCell(row as unknown[], colMap.get("observations"));

    const importRow: TimeEntryImportRow = {
      rowIndex,
      date: date ?? rawDate,
      startTime: startTime ?? rawStart,
      endTime: endTime ?? rawEnd,
      taskDescription: rawDesc,
      requirementTitle,
      category,
      observations,
      durationMinutes,
    };

    if (errors.length > 0) {
      invalid.push({ ...importRow, errors });
    } else {
      valid.push(importRow);
    }
  });

  return { valid, invalid, totalRows: valid.length + invalid.length };
}

// ─── Generador de plantilla ───────────────────────────────────────────────────

export function generateTimeEntryTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Fecha", "Inicio", "Fin", "Descripción", "Requerimiento", "Categoría", "Observaciones"],
    ["2026-06-02", "09:00", "11:30", "Desarrollo módulo de permisos ambientales", "Ajustar algoritmo de carga de permisos", "Proyecto", ""],
    ["2026-06-02", "14:00", "15:00", "Reunión de seguimiento del sprint", "", "Gestión del servicio", ""],
    ["2026-06-03", "10:00", "12:00", "Code review pull request #45", "Corrección de bug en formulario", "Proyecto", "Revisión con equipo"],
  ]);

  ws["!cols"] = [
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 48 }, { wch: 40 }, { wch: 22 }, { wch: 30 },
  ];

  const wsRef = XLSX.utils.aoa_to_sheet([
    ["Columna", "Requerido", "Formato / Valores", "Default si se omite"],
    ["Fecha", "Sí", "YYYY-MM-DD (ej. 2026-06-02)", "—"],
    ["Inicio", "Sí", "HH:mm (ej. 09:00)", "—"],
    ["Fin", "Sí", "HH:mm (ej. 11:30) — debe ser posterior al inicio", "—"],
    ["Descripción", "Sí", "Texto libre (mín. 3 caracteres)", "—"],
    ["Requerimiento", "No", "Título exacto del requerimiento en el sistema", "(sin requerimiento)"],
    ["Categoría", "No", "Proyecto · Carga · Operación · Error · Gestión del servicio", "Proyecto"],
    ["Observaciones", "No", "Texto libre", "(vacío)"],
  ]);
  wsRef["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 56 }, { wch: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Horas");
  XLSX.utils.book_append_sheet(wb, wsRef, "Referencia");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
