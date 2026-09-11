/**
 * Utilidades para importación masiva de ítems de cubicación desde archivos
 * Excel (.xlsx, .xls) o CSV.
 *
 * Columnas fijas: actividad, construcción, % fases, % Senior/Ing/Junior.
 * Columnas dinámicas: una por cada perfil operativo (horas directas).
 */
import * as XLSX from "xlsx";
import { CUBICACION_DEFAULTS } from "@/lib/calculations/cubicacion";
import {
  findProfileIdByNameHint,
  legacyDirectHoursFromMap,
  normalizeDirectProfileHours,
  sumDirectProfileHours,
  type ProfileRef,
} from "@/lib/cubicacion/direct-profile-hours";

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
  /** Horas directas por profileId. */
  directProfileHours: Record<string, number>;
  /** @deprecated Compatibilidad con plantillas legacy. */
  directorHours: number;
  /** @deprecated Compatibilidad con plantillas legacy. */
  disenadorHours: number;
}

export interface CubicacionImportRowWithError extends CubicacionImportRow {
  errors: string[];
}

export interface CubicacionImportResult {
  valid: CubicacionImportRow[];
  invalid: CubicacionImportRowWithError[];
  totalRows: number;
}

type FixedKey = Exclude<keyof CubicacionImportRow, "rowIndex" | "directProfileHours" | "directorHours" | "disenadorHours">;

// ─── Alias de columnas fijas ─────────────────────────────────────────────────

const COLUMN_ALIASES: [FixedKey, string[]][] = [
  ["activityName",       ["actividad", "requerimiento", "nombre", "descripcion", "descripción", "activity", "name"]],
  ["construccionHours",  ["construccion", "construcción", "horas construccion", "horas construcción", "horas", "hours", "construccionh", "hconstruccion"]],
  ["levantamientoPct",   ["levantamiento", "levantamiento%", "levantamientopct", "lev%", "lev"]],
  ["disenoPct",          ["diseno fase", "diseño fase", "diseño%", "disenofase", "disenopct", "dis%"]],
  ["qaAjustesPct",       ["qa", "qa+ajustes", "qa ajustes", "qaajustes", "qa%", "qapct"]],
  ["puestaEnMarchaPct",  ["puesta en marcha", "puestaenmarcha", "pem", "pem%", "puesta marcha", "puestaenarchapct"]],
  ["seniorPct",          ["senior", "senior%", "ingeniero senior", "srpct", "sr%"]],
  ["ingeneroPct",        ["ingeniero", "ingeniero%", "ing", "ing%", "ingpct", "engineer"]],
  ["juniorPct",          ["junior", "junior%", "jr", "jr%", "juniorpct"]],
];

const LEGACY_DIRECTOR_ALIASES = ["director", "horas director", "director hours", "directorh", "director h"];
const LEGACY_DISENADOR_ALIASES = ["disenador", "diseñador", "horas diseñador", "horas disenador", "disenador hours", "diseñadorh"];

const PHASE_PCT_KEYS: FixedKey[] = [
  "levantamientoPct", "disenoPct", "qaAjustesPct", "puestaEnMarchaPct",
];

const PROFILE_PCT_KEYS: FixedKey[] = [
  "seniorPct", "ingeneroPct", "juniorPct",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function detectFixedColumnMap(headers: string[]): Map<FixedKey, number> {
  const map = new Map<FixedKey, number>();

  for (const [key, aliases] of COLUMN_ALIASES) {
    const normAliases = aliases.map(normalize);
    const idx = headers.findIndex((h) => normAliases.includes(normalize(h)));
    if (idx !== -1) map.set(key, idx);
  }

  if (!map.has("activityName") && !map.has("construccionHours")) {
    map.set("activityName", 0);
    map.set("construccionHours", 1);
    const pctOrder: FixedKey[] = [
      "levantamientoPct", "disenoPct", "qaAjustesPct",
      "puestaEnMarchaPct", "seniorPct", "ingeneroPct", "juniorPct",
    ];
    pctOrder.forEach((k, i) => map.set(k, i + 2));
  }

  return map;
}

function detectProfileColumnMap(
  headers: string[],
  profiles: ProfileRef[],
  fixedMap: Map<FixedKey, number>,
): Map<string, number> {
  const usedIndexes = new Set(fixedMap.values());
  const map = new Map<string, number>();

  for (const profile of profiles) {
    const normName = normalize(profile.name);
    const idx = headers.findIndex((h, i) => !usedIndexes.has(i) && normalize(h) === normName);
    if (idx !== -1) {
      map.set(profile.id, idx);
      usedIndexes.add(idx);
    }
  }

  // Legacy Director / Diseñador headers → profile IDs
  const directorId = findProfileIdByNameHint(profiles, "director");
  const disenadorId = findProfileIdByNameHint(profiles, "disenador");
  if (directorId && !map.has(directorId)) {
    const idx = headers.findIndex((h, i) => !usedIndexes.has(i) && LEGACY_DIRECTOR_ALIASES.map(normalize).includes(normalize(h)));
    if (idx !== -1) {
      map.set(directorId, idx);
      usedIndexes.add(idx);
    }
  }
  if (disenadorId && !map.has(disenadorId)) {
    const idx = headers.findIndex((h, i) => !usedIndexes.has(i) && LEGACY_DISENADOR_ALIASES.map(normalize).includes(normalize(h)));
    if (idx !== -1) {
      map.set(disenadorId, idx);
      usedIndexes.add(idx);
    }
  }

  // Sin fallback posicional para perfiles: requiere cabeceras con el nombre del perfil
  // (o alias legacy Director/Diseñador).

  return map;
}

function getCell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  const val = row[idx];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseNonNegativeHours(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
  return n;
}

function parsePctNum(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace("%", "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
  return n > 1 ? n / 100 : n;
}

function defaultPct(key: FixedKey): number {
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
 * Parsea un archivo Excel/CSV. `profiles` define las columnas de horas directas.
 */
export function parseCubicacionFile(buffer: ArrayBuffer, profiles: ProfileRef[] = []): CubicacionImportResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (raw.length === 0) {
    return { valid: [], invalid: [], totalRows: 0 };
  }

  const firstRowStrings = (raw[0] as unknown[]).map((c) => String(c ?? "").trim());
  const hasHeader = firstRowStrings.length > 0 && isNaN(Number(firstRowStrings[0])) && firstRowStrings[0] !== "";
  const headers = hasHeader ? firstRowStrings : firstRowStrings.map((_, i) => `col${i}`);
  const dataRows = hasHeader ? raw.slice(1) : raw;

  const colMap = detectFixedColumnMap(headers);
  const profileColMap = detectProfileColumnMap(headers, profiles, colMap);

  const valid: CubicacionImportRow[] = [];
  const invalid: CubicacionImportRowWithError[] = [];

  dataRows.forEach((row, rowIndexInData) => {
    const rowIndex = hasHeader ? rowIndexInData + 1 : rowIndexInData;
    const errors: string[] = [];

    const activityName = getCell(row as unknown[], colMap.get("activityName"));
    const rawHours = getCell(row as unknown[], colMap.get("construccionHours"));

    if (!activityName && !rawHours) return;

    if (!activityName) errors.push("Nombre de actividad requerido.");

    const directProfileHours: Record<string, number> = {};
    for (const [profileId, colIdx] of profileColMap.entries()) {
      const rawDirect = getCell(row as unknown[], colIdx);
      if (!rawDirect) continue;
      const n = parseNonNegativeHours(rawDirect);
      if (n === null) {
        const profileName = profiles.find((p) => p.id === profileId)?.name ?? profileId;
        errors.push(`Horas inválidas para perfil "${profileName}": "${rawDirect}".`);
      } else if (n > 0) {
        directProfileHours[profileId] = n;
      }
    }

    const hasDirectHours = sumDirectProfileHours(directProfileHours) > 0;
    const rawHoursNum = parseNonNegativeHours(rawHours);
    const construccionHours = rawHoursNum !== null ? rawHoursNum : null;

    if (construccionHours === null) {
      errors.push(`Horas de construcción inválidas: "${rawHours}". Debe ser un número ≥ 0.`);
    } else if (construccionHours === 0 && !hasDirectHours) {
      errors.push("Las horas de construcción deben ser mayores a 0 si no se asignan horas directas por perfil.");
    }

    const pcts: Partial<Record<FixedKey, number>> = {};
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

    const profileRaw: Partial<Record<FixedKey, string>> = {};
    for (const key of PROFILE_PCT_KEYS) {
      profileRaw[key] = getCell(row as unknown[], colMap.get(key));
    }
    const anyProfileProvided = PROFILE_PCT_KEYS.some((k) => !!profileRaw[k]);

    for (const key of PROFILE_PCT_KEYS) {
      const rawPct = profileRaw[key] ?? "";
      if (!rawPct) {
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

    const normalizedDirect = normalizeDirectProfileHours(directProfileHours);
    const legacy = legacyDirectHoursFromMap(normalizedDirect, profiles);

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
      directProfileHours: normalizedDirect,
      directorHours: legacy.directorHours,
      disenadorHours: legacy.disenadorHours,
    };

    if (errors.length > 0) {
      invalid.push({ ...importRow, errors });
    } else {
      valid.push(importRow);
    }
  });

  return { valid, invalid, totalRows: valid.length + invalid.length };
}

const pctToInt = (v: number) => Math.round(v * 100);

/**
 * Genera plantilla Excel con columnas de horas directas según perfiles activos.
 */
export function generateCubicacionTemplate(profiles: ProfileRef[] = []): Blob {
  const profileHeaders = profiles.map((p) => p.name);
  const header = [
    "Actividad",
    "Horas Construcción",
    "Levantamiento %",
    "Diseño Fase %",
    "QA+Ajustes %",
    "Puesta en Marcha %",
    "Senior %",
    "Ingeniero %",
    "Junior %",
    ...profileHeaders,
  ];

  const exampleConstruction = [
    "Ejemplo: Modificar banner de inicio",
    8,
    pctToInt(CUBICACION_DEFAULTS.levantamientoPct),
    pctToInt(CUBICACION_DEFAULTS.disenoPct),
    pctToInt(CUBICACION_DEFAULTS.qaAjustesPct),
    pctToInt(CUBICACION_DEFAULTS.puestaEnMarchaPct),
    pctToInt(CUBICACION_DEFAULTS.seniorPct),
    pctToInt(CUBICACION_DEFAULTS.ingeneroPct),
    pctToInt(CUBICACION_DEFAULTS.juniorPct),
    ...profiles.map(() => 0),
  ];

  const exampleDirect = [
    "Ejemplo: Gestión del servicio",
    0,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ...profiles.map((p, i) => {
      const lower = p.name.toLowerCase();
      if (lower.includes("director")) return 10;
      if (i === 0 && !profiles.some((x) => x.name.toLowerCase().includes("director"))) return 10;
      return 0;
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, exampleConstruction, exampleDirect]);
  ws["!cols"] = [
    { wch: 40 },
    { wch: 18 },
    ...Array(7).fill({ wch: 14 }),
    ...profiles.map(() => ({ wch: 14 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cubicación");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
