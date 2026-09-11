/** Helpers for dynamic direct profile hours on cubicación items. */

export type ProfileRef = { id: string; name: string };

export function normalizeDirectProfileHours(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === "number" ? value : Number(value);
    if (!key || !Number.isFinite(n) || n < 0) continue;
    if (n === 0) continue;
    out[key] = Math.round(n * 10000) / 10000;
  }
  return out;
}

export function sumDirectProfileHours(hours: Record<string, number> | undefined | null): number {
  if (!hours) return 0;
  let total = 0;
  for (const value of Object.values(hours)) {
    if (Number.isFinite(value) && value > 0) total += value;
  }
  return Math.round(total * 100) / 100;
}

export function findProfileIdByNameHint(
  profiles: ProfileRef[],
  hint: "director" | "disenador",
): string | undefined {
  const needle = hint === "director" ? "director" : "dise";
  const match = profiles.find((p) => p.name.toLowerCase().includes(needle));
  return match?.id;
}

/** Sync legacy Director/Diseñador columns from the dynamic map (or keep provided fallbacks). */
export function legacyDirectHoursFromMap(
  hours: Record<string, number>,
  profiles: ProfileRef[],
  fallback?: { directorHours?: number; disenadorHours?: number },
): { directorHours: number; disenadorHours: number } {
  const directorId = findProfileIdByNameHint(profiles, "director");
  const disenadorId = findProfileIdByNameHint(profiles, "disenador");
  return {
    directorHours: directorId
      ? Number(hours[directorId] ?? 0)
      : Number(fallback?.directorHours ?? 0),
    disenadorHours: disenadorId
      ? Number(hours[disenadorId] ?? 0)
      : Number(fallback?.disenadorHours ?? 0),
  };
}

/**
 * If the dynamic map is empty but legacy columns have values, synthesize a map
 * using profile name hints (for rows not yet backfilled).
 */
export function coalesceDirectProfileHours(input: {
  directProfileHours?: Record<string, number> | null;
  directorHours?: number;
  disenadorHours?: number;
  profiles?: ProfileRef[];
}): Record<string, number> {
  const fromMap = normalizeDirectProfileHours(input.directProfileHours);
  if (Object.keys(fromMap).length > 0) return fromMap;

  const profiles = input.profiles ?? [];
  const synthesized: Record<string, number> = {};
  const directorId = findProfileIdByNameHint(profiles, "director");
  const disenadorId = findProfileIdByNameHint(profiles, "disenador");
  if (directorId && (input.directorHours ?? 0) > 0) {
    synthesized[directorId] = Number(input.directorHours);
  }
  if (disenadorId && (input.disenadorHours ?? 0) > 0) {
    synthesized[disenadorId] = Number(input.disenadorHours);
  }
  return synthesized;
}

export function setDirectHoursForProfile(
  hours: Record<string, number>,
  profileId: string,
  value: number,
): Record<string, number> {
  const next = { ...hours };
  if (!Number.isFinite(value) || value <= 0) {
    delete next[profileId];
  } else {
    next[profileId] = Math.round(value * 10000) / 10000;
  }
  return next;
}
