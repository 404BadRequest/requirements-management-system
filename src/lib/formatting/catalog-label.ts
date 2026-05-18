function looksLikeTechnicalCode(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.length <= 6 && /^[A-Z0-9]+$/.test(v)) return true;
  if (/^[A-Z0-9_]+$/.test(v)) return true;
  return false;
}

function looksLikeHumanLabel(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.includes(" ")) return true;
  if (/[a-záéíóúñ]/.test(v)) return true;
  return false;
}

/**
 * Devuelve una etiqueta legible para catálogos aunque code/label estén invertidos.
 */
export function formatCatalogLabel(code: string, label?: string | null): string {
  const rawCode = code.trim();
  const rawLabel = label?.trim() ?? "";
  if (!rawLabel) return rawCode;

  const codeIsTechnical = looksLikeTechnicalCode(rawCode);
  const labelIsTechnical = looksLikeTechnicalCode(rawLabel);
  const codeIsHuman = looksLikeHumanLabel(rawCode);
  const labelIsHuman = looksLikeHumanLabel(rawLabel);

  if (codeIsTechnical && labelIsHuman) return rawLabel;
  if (codeIsHuman && labelIsTechnical) return `${rawCode} (${rawLabel})`;
  if (labelIsHuman) return rawLabel;
  if (codeIsHuman) return rawCode;
  return rawLabel;
}
