/** Prefijo canónico de la ficha: `/requirements/id/{requirementId}`. */
export const REQUIREMENT_DETAIL_PREFIX = "/requirements/id";

/** Ruta de la ficha de un requerimiento (siempre por id técnico). */
export function requirementDetailPath(requirementId: string): string {
  return `${REQUIREMENT_DETAIL_PREFIX}/${encodeURIComponent(requirementId)}`;
}
