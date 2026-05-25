/**
 * Utilidades para importación masiva de Requerimientos desde Excel o CSV.
 */
import * as XLSX from "xlsx";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface RequirementImportRow {
  rowIndex: number;
  title: string;
  description: string;
  origin: string;
  priority: string;
  status: string;
  notes: string;
}

export interface RequirementImportRowWithError extends RequirementImportRow {
  errors: string[];
}

export interface RequirementImportResult {
  valid: RequirementImportRow[];
  invalid: RequirementImportRowWithError[];
  totalRows: number;
}

// ─── Alias de columnas ────────────────────────────────────────────────────────

const COLUMN_ALIASES: [keyof RequirementImportRow, string[]][] = [
  ["title",       ["titulo", "título", "name", "nombre", "requerimiento", "actividad"]],
  ["description", ["descripcion", "descripción", "description", "detalle", "desc"]],
  ["origin",      ["origen", "origin", "fuente"]],
  ["priority",    ["prioridad", "priority", "prio"]],
  ["status",      ["estado", "status", "estatus"]],
  ["notes",       ["notas", "notes", "observaciones", "comentarios"]],
];

const DEFAULT_STATUS   = "BACKLOG";
const DEFAULT_PRIORITY = "P2";
const DEFAULT_ORIGIN   = "Importación";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectColumnMap(headers: string[]): Map<keyof RequirementImportRow, number> {
  const map = new Map<keyof RequirementImportRow, number>();
  for (const [key, aliases] of COLUMN_ALIASES) {
    const normAliases = aliases.map(normalize);
    const idx = headers.findIndex((h) => normAliases.includes(normalize(h)));
    if (idx !== -1) map.set(key, idx);
  }
  // Fallback posicional si no se detectaron cabeceras
  if (!map.has("title")) {
    map.set("title", 0);
    map.set("description", 1);
    map.set("origin", 2);
    map.set("priority", 3);
    map.set("status", 4);
    map.set("notes", 5);
  }
  return map;
}

function getCell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  const val = row[idx];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

const VALID_STATUSES = new Set([
  "BACKLOG", "READY_FOR_QA", "QA_DONE",
  "READY_FOR_PROD", "DONE_PROD", "WONT_DO", "CLIENT_VALIDATION",
]);

const VALID_PRIORITIES = new Set(["P0", "P1", "P2", "P3", "P4", "P5", "P6"]);

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseRequirementFile(buffer: ArrayBuffer): RequirementImportResult {
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

  const valid: RequirementImportRow[] = [];
  const invalid: RequirementImportRowWithError[] = [];

  dataRows.forEach((row, rowIndexInData) => {
    const rowIndex = hasHeader ? rowIndexInData + 1 : rowIndexInData;
    const errors: string[] = [];

    const title = getCell(row as unknown[], colMap.get("title"));
    if (!title && !getCell(row as unknown[], colMap.get("description"))) return; // fila vacía

    if (!title || title.length < 3) {
      errors.push("El título debe tener al menos 3 caracteres.");
    }

    const rawPriority = getCell(row as unknown[], colMap.get("priority"));
    const priority = rawPriority ? rawPriority.toUpperCase() : DEFAULT_PRIORITY;
    if (!VALID_PRIORITIES.has(priority)) {
      errors.push(`Prioridad inválida: "${rawPriority}". Valores aceptados: P0–P6.`);
    }

    const rawStatus = getCell(row as unknown[], colMap.get("status"));
    const status = rawStatus ? rawStatus.toUpperCase() : DEFAULT_STATUS;
    if (!VALID_STATUSES.has(status)) {
      errors.push(`Estado inválido: "${rawStatus}". Valores aceptados: ${[...VALID_STATUSES].join(", ")}.`);
    }

    const description = getCell(row as unknown[], colMap.get("description")) || title || " ";
    const origin      = getCell(row as unknown[], colMap.get("origin")) || DEFAULT_ORIGIN;
    const notes       = getCell(row as unknown[], colMap.get("notes"));

    const importRow: RequirementImportRow = {
      rowIndex, title, description, origin, priority, status, notes,
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

export function generateRequirementTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Título", "Descripción", "Origen", "Prioridad", "Estado", "Notas"],
    [
      "Ejemplo: Ajustar algoritmo de carga de permisos",
      "Modificar el módulo de permisos para optimizar la carga inicial",
      "Cliente",
      "P2",
      "BACKLOG",
      "",
    ],
    [
      "Ejemplo: Corrección de bug en formulario de contacto",
      "El formulario no valida correctamente el campo de email",
      "QA",
      "P1",
      "BACKLOG",
      "Detectado en sprint anterior",
    ],
  ]);

  ws["!cols"] = [
    { wch: 48 }, { wch: 55 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 30 },
  ];

  // Hoja de referencia con valores válidos
  const wsRef = XLSX.utils.aoa_to_sheet([
    ["Columna", "Requerido", "Valores aceptados", "Default si se omite"],
    ["Título", "Sí", "Texto (mín. 3 caracteres)", "—"],
    ["Descripción", "No", "Texto libre", "Mismo valor que Título"],
    ["Origen", "No", "Texto libre (ej. Cliente, QA, Equipo, Importación)", "Importación"],
    ["Prioridad", "No", "P0, P1, P2, P3, P4, P5, P6", "P2"],
    ["Estado", "No", "BACKLOG · READY_FOR_QA · QA_DONE · READY_FOR_PROD · DONE_PROD · WONT_DO · CLIENT_VALIDATION", "BACKLOG"],
    ["Notas", "No", "Texto libre", "(vacío)"],
  ]);
  wsRef["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 80 }, { wch: 30 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Requerimientos");
  XLSX.utils.book_append_sheet(wb, wsRef, "Referencia");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
