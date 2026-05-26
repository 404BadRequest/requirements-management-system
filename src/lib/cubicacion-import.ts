/**
 * Utilidades para importación masiva de ítems de cubicación desde archivos
 * Excel (.xlsx, .xls) o CSV.
 *
 * Estrategia de detección de columnas:
 * 1. Se intenta hacer match por nombre de cabecera (case-insensitive, ignora espacios y caracteres especiales).
 * 2. Si no hay cabecera reconocida en la primera fila, se asume orden posicional (A, B, C…).
 */
import * as XLSX from "xlsx";
import { CUBICACION_DEFAULTS } from "@/lib/calculations/cubicacion";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface CubicacionImportRow {
  /** Índice 0-based de la fila original en el archivo */
  rowIndex: number;
  activityName: string;
  construccionHours: number;
  levantamientoPct: number;
  disenoPct: number;
  qaAjustesPct: number;
  puestaEnMarchaPct: number;
  seniorPct: number;
  ingeneroPct: number;
  juniorPct: number;
}

export interface CubicacionImportRowWithError extends CubicacionImportRow {
  errors: string[];
}

export interface CubicacionImportResult {
  valid: CubicacionImportRow[];
  invalid: CubicacionImportRowWithError[];
  totalRows: number;
}

// ─── Alias de columnas aceptadas ─────────────────────────────────────────────

/** Cada entrada: [clave_interna, aliases_posibles] */
const COLUMN_ALIASES: [keyof CubicacionImportRow, string[]][] = [
  ["activityName",       ["actividad", "requerimiento", "nombre", "descripcion", "descripción", "activity", "name"]],
  ["construccionHours",  ["construccion", "construcción", "horas construccion", "horas construcción", "horas", "hours", "construccionh", "hconstruccion"]],
  ["levantamientoPct",   ["levantamiento", "levantamiento%", "levantamientopct", "lev%", "lev"]],
  ["disenoPct",          ["diseno", "diseño", "diseño%", "disenopct", "dis%", "dis"]],
  ["qaAjustesPct",       ["qa", "qa+ajustes", "qa ajustes", "qaajustes", "qa%", "qapct"]],
  ["puestaEnMarchaPct",  ["puesta en marcha", "puestaenmarcha", "pem", "pem%", "puesta marcha", "puestaenarchapct"]],
  ["seniorPct",          ["senior", "senior%", "ingeniero senior", "srpct", "sr%"]],
  ["ingeneroPct",        ["ingeniero", "ingeniero%", "ing", "ing%", "ingpct", "engineer"]],
  ["juniorPct",          ["junior", "junior%", "jr", "jr%", "juniorpct"]],
];

const REQUIRED_KEYS: Array<keyof CubicacionImportRow> = ["activityName", "construccionHours"];

/** Porcentajes de FASE: controlan la distribución de horas por etapa del proyecto. */
const PHASE_PCT_KEYS: Array<keyof CubicacionImportRow> = [
  "levantamientoPct", "disenoPct", "qaAjustesPct", "puestaEnMarchaPct",
];

/**
 * Porcentajes de PERFIL: controlan cuántas horas trabaja cada perfil.
 * Si el usuario especifica al menos uno, los vacíos se tratan como 0
 * (no se aplican defaults del sistema). Si no especifica ninguno, se usan defaults.
 */
const PROFILE_PCT_KEYS: Array<keyof CubicacionImportRow> = [
  "seniorPct", "ingeneroPct", "juniorPct",
];

const PCT_KEYS: Array<keyof CubicacionImportRow> = [...PHASE_PCT_KEYS, ...PROFILE_PCT_KEYS];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectColumnMap(headers: string[]): Map<keyof CubicacionImportRow, number> {
  const map = new Map<keyof CubicacionImportRow, number>();

  for (const [key, aliases] of COLUMN_ALIASES) {
    const normAliases = aliases.map(normalize);
    const idx = headers.findIndex((h) => normAliases.includes(normalize(h)));
    if (idx !== -1) map.set(key, idx);
  }

  // Fallback posicional si no se detectaron cabeceras: col0=actividad, col1=construcción, col2..8=porcentajes
  if (!map.has("activityName") && !map.has("construccionHours")) {
    map.set("activityName", 0);
    map.set("construccionHours", 1);
    const pctOrder: Array<keyof CubicacionImportRow> = [
      "levantamientoPct", "disenoPct", "qaAjustesPct",
      "puestaEnMarchaPct", "seniorPct", "ingeneroPct", "juniorPct",
    ];
    pctOrder.forEach((k, i) => map.set(k, i + 2));
  }

  return map;
}

function getCell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  const val = row[idx];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * Parsea horas de construcción como número positivo sin conversión de porcentaje.
 * "1" → 1 hora, "14.7" → 14.7 horas.
 */
function parseHoursNum(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

/**
 * Parsea un porcentaje y lo normaliza siempre a fracción decimal (0–1).
 * - "5"    → 0.05  (entero > 1 → dividir entre 100)
 * - "0.05" → 0.05  (ya es fracción decimal → conservar)
 * - "70"   → 0.7
 * - "0.7"  → 0.7
 * - "100"  → 1.0
 */
function parsePctNum(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace("%", "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
  // Valores > 1 se interpretan como porcentaje entero (0-100) → normalizar a fracción
  return n > 1 ? n / 100 : n;
}

function defaultPct(key: keyof CubicacionImportRow): number {
  const defaults: Record<string, number> = {
    levantamientoPct:  CUBICACION_DEFAULTS.levantamientoPct,
    disenoPct:         CUBICACION_DEFAULTS.disenoPct,
    qaAjustesPct:      CUBICACION_DEFAULTS.qaAjustesPct,
    puestaEnMarchaPct: CUBICACION_DEFAULTS.puestaEnMarchaPct,
    seniorPct:         CUBICACION_DEFAULTS.seniorPct,
    ingeneroPct:       CUBICACION_DEFAULTS.ingeneroPct,
    juniorPct:         CUBICACION_DEFAULTS.juniorPct,
  };
  return defaults[key as string] ?? 0;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Parsea un archivo Excel o CSV (como ArrayBuffer) y retorna filas válidas e inválidas.
 * Si la primera fila tiene texto en la primera celda, se usa como cabecera.
 * Si no, se asume que los datos empiezan en la primera fila (sin cabecera).
 */
export function parseCubicacionFile(buffer: ArrayBuffer): CubicacionImportResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (raw.length === 0) {
    return { valid: [], invalid: [], totalRows: 0 };
  }

  // Detectar si la primera fila es una cabecera (texto en primera celda, no número)
  const firstRowStrings = (raw[0] as unknown[]).map((c) => String(c ?? "").trim());
  const hasHeader = firstRowStrings.length > 0 && isNaN(Number(firstRowStrings[0])) && firstRowStrings[0] !== "";
  const headers = hasHeader ? firstRowStrings : firstRowStrings.map((_, i) => `col${i}`);
  const dataRows = hasHeader ? raw.slice(1) : raw;

  const colMap = detectColumnMap(headers);

  const valid: CubicacionImportRow[] = [];
  const invalid: CubicacionImportRowWithError[] = [];

  dataRows.forEach((row, rowIndexInData) => {
    const rowIndex = hasHeader ? rowIndexInData + 1 : rowIndexInData; // real row in file (0-based)
    const errors: string[] = [];

    const activityName = getCell(row as unknown[], colMap.get("activityName"));
    const rawHours = getCell(row as unknown[], colMap.get("construccionHours"));

    // Ignorar filas completamente vacías
    if (!activityName && !rawHours) return;

    if (!activityName) errors.push("Nombre de actividad requerido.");

    const construccionHours = parseHoursNum(rawHours);
    if (construccionHours === null) {
      errors.push(`Horas de construcción inválidas: "${rawHours}". Debe ser un número positivo.`);
    }

    // ── Porcentajes de FASE: siempre usan defaults si están vacíos ──────────────
    const pcts: Partial<Record<keyof CubicacionImportRow, number>> = {};
    for (const key of PHASE_PCT_KEYS) {
      const rawPct = getCell(row as unknown[], colMap.get(key));
      if (!rawPct) {
        pcts[key] = defaultPct(key);
      } else {
        const n = parsePctNum(rawPct);
        if (n === null || n < 0 || n > 1) {
          errors.push(`Porcentaje inválido en "${key}": "${rawPct}". Ingresa un valor entre 0 y 100 (ej. 5 para 5%).`);
          pcts[key] = defaultPct(key);
        } else {
          pcts[key] = n;
        }
      }
    }

    // ── Porcentajes de PERFIL: lógica opt-in ─────────────────────────────────
    // Si el usuario especifica AL MENOS UNO, los vacíos = 0 (no se aplican defaults).
    // Si no especifica NINGUNO, se aplican los defaults del sistema para los tres.
    const profileRaw: Partial<Record<keyof CubicacionImportRow, string>> = {};
    for (const key of PROFILE_PCT_KEYS) {
      profileRaw[key] = getCell(row as unknown[], colMap.get(key));
    }
    const anyProfileProvided = PROFILE_PCT_KEYS.some((k) => !!profileRaw[k]);

    for (const key of PROFILE_PCT_KEYS) {
      const rawPct = profileRaw[key] ?? "";
      if (!rawPct) {
        // Si el usuario proveyó algún perfil → vacío = 0; si no proveyó ninguno → default
        pcts[key] = anyProfileProvided ? 0 : defaultPct(key);
      } else {
        const n = parsePctNum(rawPct);
        if (n === null || n < 0 || n > 1) {
          errors.push(`Porcentaje inválido en "${key}": "${rawPct}". Ingresa un valor entre 0 y 100 (ej. 70 para 70%).`);
          pcts[key] = anyProfileProvided ? 0 : defaultPct(key);
        } else {
          pcts[key] = n;
        }
      }
    }

    const importRow: CubicacionImportRow = {
      rowIndex,
      activityName: activityName || "",
      construccionHours: construccionHours ?? 0,
      levantamientoPct:  pcts.levantamientoPct!,
      disenoPct:         pcts.disenoPct!,
      qaAjustesPct:      pcts.qaAjustesPct!,
      puestaEnMarchaPct: pcts.puestaEnMarchaPct!,
      seniorPct:         pcts.seniorPct!,
      ingeneroPct:       pcts.ingeneroPct!,
      juniorPct:         pcts.juniorPct!,
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

/**
 * Genera un archivo Excel (.xlsx) de plantilla con cabeceras y una fila de ejemplo.
 * Retorna un Blob listo para descarga.
 */
/** Convierte fracción decimal a entero porcentual para la plantilla (0.05 → 5). */
const pctToInt = (v: number) => Math.round(v * 100);

export function generateCubicacionTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Actividad",
      "Horas Construcción",
      "Levantamiento %",
      "Diseño %",
      "QA+Ajustes %",
      "Puesta en Marcha %",
      "Senior %",
      "Ingeniero %",
      "Junior %",
    ],
    [
      "Ejemplo: Modificar banner de inicio",
      8,
      pctToInt(CUBICACION_DEFAULTS.levantamientoPct),
      pctToInt(CUBICACION_DEFAULTS.disenoPct),
      pctToInt(CUBICACION_DEFAULTS.qaAjustesPct),
      pctToInt(CUBICACION_DEFAULTS.puestaEnMarchaPct),
      pctToInt(CUBICACION_DEFAULTS.seniorPct),
      pctToInt(CUBICACION_DEFAULTS.ingeneroPct),
      pctToInt(CUBICACION_DEFAULTS.juniorPct),
    ],
    ["Ejemplo: Reuniones semanales", 4, "", "", "", "", "", "", ""],
  ]);

  // Ancho de columnas
  ws["!cols"] = [{ wch: 40 }, { wch: 18 }, ...Array(7).fill({ wch: 14 })];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cubicación");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
