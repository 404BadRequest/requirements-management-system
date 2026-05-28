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

export interface CubicacionImportTask {
  title: string;
  description: string;
  estimatedHours: number;
  sortOrder: number;
}

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
  /** Horas directas del Director (sin cálculo de porcentajes). */
  directorHours: number;
  /** Horas directas del Diseñador (sin cálculo de porcentajes). */
  disenadorHours: number;
  /** Subtareas del plan de trabajo (columna Contempla + distribución de horas). */
  tasks: CubicacionImportTask[];
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

type CubicacionImportColumnKey =
  | Exclude<keyof CubicacionImportRow, "rowIndex" | "tasks">
  | "contempla";

/** Cada entrada: [clave_interna, aliases_posibles] */
const COLUMN_ALIASES: [CubicacionImportColumnKey, string[]][] = [
  ["activityName",       ["actividad", "actividades", "requerimiento", "nombre", "descripcion", "descripción", "activity", "name"]],
  ["construccionHours",  ["construccion", "construcción", "horas construccion", "horas construcción", "horas", "hours", "construccionh", "hconstruccion"]],
  ["levantamientoPct",   ["levantamiento", "levantamiento%", "levantamientopct", "lev%", "lev"]],
  ["disenoPct",          ["diseno fase", "diseño fase", "diseño%", "disenofase", "disenopct", "dis%"]],
  ["qaAjustesPct",       ["qa", "qa+ajustes", "qa ajustes", "qaajustes", "qa%", "qapct"]],
  ["puestaEnMarchaPct",  ["puesta en marcha", "puestaenmarcha", "pem", "pem%", "puesta marcha", "puestaenarchapct"]],
  ["seniorPct",          ["senior", "senior%", "ingeniero senior", "srpct", "sr%"]],
  ["ingeneroPct",        ["ingeniero", "ingeniero%", "ing", "ing%", "ingpct", "engineer"]],
  ["juniorPct",          ["junior", "junior%", "jr", "jr%", "juniorpct"]],
  ["directorHours",      ["director", "horas director", "director hours", "directorh", "director h"]],
  ["disenadorHours",     ["disenador", "diseñador", "horas diseñador", "horas disenador", "disenador hours", "diseñadorh"]],
  ["contempla",          ["contempla", "contemplas", "tareas", "plan de trabajo", "subtareas", "actividades menores"]],
];

const REQUIRED_KEYS: Array<CubicacionImportColumnKey> = ["activityName", "construccionHours"];

/** Porcentajes de FASE: controlan la distribución de horas por etapa del proyecto. */
const PHASE_PCT_KEYS: Array<CubicacionImportColumnKey> = [
  "levantamientoPct", "disenoPct", "qaAjustesPct", "puestaEnMarchaPct",
];

/**
 * Porcentajes de PERFIL: controlan cuántas horas trabaja cada perfil.
 * Si el usuario especifica al menos uno, los vacíos se tratan como 0
 * (no se aplican defaults del sistema). Si no especifica ninguno, se usan defaults.
 */
const PROFILE_PCT_KEYS: Array<CubicacionImportColumnKey> = [
  "seniorPct", "ingeneroPct", "juniorPct",
];

const PCT_KEYS: Array<CubicacionImportColumnKey> = [...PHASE_PCT_KEYS, ...PROFILE_PCT_KEYS];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectColumnMap(headers: string[]): Map<CubicacionImportColumnKey, number> {
  const map = new Map<CubicacionImportColumnKey, number>();

  for (const [key, aliases] of COLUMN_ALIASES) {
    const normAliases = aliases.map(normalize);
    const idx = headers.findIndex((h) => normAliases.includes(normalize(h)));
    if (idx !== -1) map.set(key, idx);
  }

  // Fallback posicional si no se detectaron cabeceras: col0=actividad, col1=construcción, col2..8=porcentajes, col9=director, col10=diseñador
  if (!map.has("activityName") && !map.has("construccionHours")) {
    map.set("activityName", 0);
    map.set("construccionHours", 1);
    const pctOrder: Array<CubicacionImportColumnKey> = [
      "levantamientoPct", "disenoPct", "qaAjustesPct",
      "puestaEnMarchaPct", "seniorPct", "ingeneroPct", "juniorPct",
      "directorHours", "disenadorHours",
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
 * Parsea un número de horas positivo (> 0) sin conversión de porcentaje.
 * "1" → 1 hora, "14.7" → 14.7 horas.
 * Retorna null si es inválido o ≤ 0.
 */
function parseHoursNum(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

/**
 * Parsea un número de horas que puede ser cero o positivo.
 * Retorna null solo si el valor es inválido (texto no numérico o negativo).
 */
function parseNonNegativeHours(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
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

function defaultPct(key: CubicacionImportColumnKey): number {
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

/** Extrae subtareas numeradas de la columna Contempla (ej. "1) Tarea A\n2) Tarea B"). */
export function parseContemplaTasks(raw: string): { title: string; description: string }[] {
  const text = raw.trim();
  if (!text) return [];

  const numbered = text.match(/(?:^|\n)\s*\d+[\.\)]\s*.+/g);
  if (numbered?.length) {
    return numbered
      .map((block) => {
        const title = block.replace(/^\s*\d+[\.\)]\s*/, "").trim();
        return { title, description: "" };
      })
      .filter((t) => t.title.length > 0);
  }

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title) => ({ title, description: "" }));
}

/**
 * Parsea horas de construcción con distribución por tarea.
 * Acepta fórmulas Excel como "=2+1" → total 3, partes [2, 1].
 */
export function parseConstructionHourDistribution(
  rawValue: string,
  formula?: string | null,
): { total: number; parts: number[] } {
  const formulaSource = formula?.replace(/^=/, "").trim();
  const rawSource = rawValue.replace(/^=/, "").trim();

  const source =
    formulaSource && formulaSource.includes("+")
      ? formulaSource
      : rawSource.includes("+")
        ? rawSource
        : formulaSource || rawSource;

  if (source.includes("+")) {
    const parts = source
      .split("+")
      .map((part) => parseNonNegativeHours(part.trim()))
      .filter((n): n is number => n !== null);

    if (parts.length === 0) {
      throw new Error("La distribución de horas de construcción no es válida (ej. 2+1).");
    }

    const total = parts.reduce((sum, n) => sum + n, 0);
    return { total, parts };
  }

  const single = parseNonNegativeHours(source);
  if (single === null) {
    throw new Error(`Horas de construcción inválidas: "${rawValue}". Debe ser un número ≥ 0 o una suma (ej. 2+1).`);
  }

  return { total: single, parts: [single] };
}

function buildRequirementTasks(
  contemplaRaw: string,
  construccionParts: number[],
): CubicacionImportTask[] {
  const parsedTasks = parseContemplaTasks(contemplaRaw);
  if (parsedTasks.length === 0) return [];

  if (construccionParts.length !== parsedTasks.length) {
    throw new Error(
      `Contempla tiene ${parsedTasks.length} tarea(s) pero construcción tiene ${construccionParts.length} parte(s) de horas. ` +
        `Usa formato 2+1 (o fórmula =2+1 en Excel) con una parte por tarea.`,
    );
  }

  return parsedTasks.map((task, index) => ({
    title: task.title,
    description: task.description,
    estimatedHours: construccionParts[index] ?? 0,
    sortOrder: index,
  }));
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Parsea un archivo Excel o CSV (como ArrayBuffer) y retorna filas válidas e inválidas.
 * Si la primera fila tiene texto en la primera celda, se usa como cabecera.
 * Si no, se asume que los datos empiezan en la primera fila (sin cabecera).
 */
export function parseCubicacionFile(buffer: ArrayBuffer): CubicacionImportResult {
  const workbook = XLSX.read(buffer, { type: "array", cellFormula: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No se pudo leer la hoja de cálculo.");
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

    // Parseo preliminar de horas directas para poder validar construccionHours
    // condicionalmente (se permite 0 si hay horas Director o Diseñador).
    const rawDirectorHoursEarly  = getCell(row as unknown[], colMap.get("directorHours"));
    const rawDisenadorHoursEarly = getCell(row as unknown[], colMap.get("disenadorHours"));
    const directorHoursEarly  = rawDirectorHoursEarly  ? (parseHoursNum(rawDirectorHoursEarly)  ?? 0) : 0;
    const disenadorHoursEarly = rawDisenadorHoursEarly ? (parseHoursNum(rawDisenadorHoursEarly) ?? 0) : 0;
    const hasDirectHours = directorHoursEarly > 0 || disenadorHoursEarly > 0;

    // Construcción: puede ser 0 si hay horas directas (ej. "Gestión del servicio")
    // También acepta distribución por tarea: 2+1 o fórmula =2+1 en Excel.
    const constrCol = colMap.get("construccionHours");
    const sheetRow = hasHeader ? rowIndexInData + 1 : rowIndexInData;
    const constrCell =
      constrCol !== undefined
        ? sheet[XLSX.utils.encode_cell({ r: sheetRow, c: constrCol })]
        : undefined;

    let construccionHours: number | null = null;
    let construccionParts: number[] = [0];

    try {
      const distribution = parseConstructionHourDistribution(rawHours, constrCell?.f ?? null);
      construccionHours = distribution.total;
      construccionParts = distribution.parts;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Horas de construcción inválidas.");
    }

    if (construccionHours === 0 && !hasDirectHours) {
      errors.push("Las horas de construcción deben ser mayores a 0 si no se asignan horas directas de Director o Diseñador.");
    }

    const contemplaRaw = getCell(row as unknown[], colMap.get("contempla"));
    let tasks: CubicacionImportTask[] = [];
    try {
      tasks = buildRequirementTasks(contemplaRaw, construccionParts);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "No se pudieron parsear las tareas de Contempla.");
    }

    // ── Porcentajes de FASE: siempre usan defaults si están vacíos ──────────────
    const pcts: Partial<Record<CubicacionImportColumnKey, number>> = {};
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
    const profileRaw: Partial<Record<CubicacionImportColumnKey, string>> = {};
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

    // ── Horas directas (Director, Diseñador): reutilizamos los valores ya calculados
    const directorHours  = directorHoursEarly;
    const disenadorHours = disenadorHoursEarly;

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
      directorHours,
      disenadorHours,
      tasks,
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
      "Diseño Fase %",
      "QA+Ajustes %",
      "Puesta en Marcha %",
      "Senior %",
      "Ingeniero %",
      "Junior %",
      "Director",
      "Diseñador",
      "Contempla",
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
      0,
      0,
      "",
    ],
    [
      "Ejemplo: 2 banners en sección",
      "2+1",
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      "1) Incorporar registro en base de datos\n2) Generar link de acceso por proyecto",
    ],
    ["Ejemplo: Gestión del servicio", 0, "", "", "", "", "", "", "", 10, 0, ""],
  ]);

  // Ancho de columnas
  ws["!cols"] = [{ wch: 40 }, { wch: 18 }, ...Array(7).fill({ wch: 14 }), { wch: 12 }, { wch: 12 }, { wch: 48 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cubicación");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
