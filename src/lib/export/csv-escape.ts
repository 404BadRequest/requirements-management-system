/** Escapado mínimo para celdas CSV (RFC 4180 simplificado). */
export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
