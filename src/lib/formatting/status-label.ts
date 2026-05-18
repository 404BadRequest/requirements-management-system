const STATUS_NAME_FALLBACK: Record<string, string> = {
  PDR: "Por desarrollar",
  BACKLOG: "Por desarrollar",
  READY_FOR_QA: "Pasar a QA",
  QA_DONE: "Listo en QA",
  READY_FOR_PROD: "Pasar a produccion",
  DONE_PROD: "Listo en produccion",
  WONT_DO: "No desarrollar",
  CLIENT_VALIDATION: "Validar con cliente",
};

function looksLikeTechnicalCode(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.length <= 5 && /^[A-Z0-9]+$/.test(v)) return true;
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
 * Entrega un texto legible para estados cuando el catálogo guarda códigos técnicos
 * como etiqueta (p. ej. `PDR`).
 */
export function formatStatusLabel(code: string, label?: string | null): string {
  const statusCode = code.trim();
  const cleanLabel = label?.trim() ?? "";

  if (!cleanLabel) {
    const fallbackOnly = STATUS_NAME_FALLBACK[statusCode.toUpperCase()];
    return fallbackOnly ? `${fallbackOnly} (${statusCode})` : statusCode;
  }

  if (cleanLabel.toUpperCase() === statusCode.toUpperCase()) {
    const fallback = STATUS_NAME_FALLBACK[statusCode.toUpperCase()] ?? STATUS_NAME_FALLBACK[cleanLabel.toUpperCase()];
    return fallback ? `${fallback} (${statusCode})` : statusCode;
  }

  const codeIsTechnical = looksLikeTechnicalCode(statusCode);
  const labelIsTechnical = looksLikeTechnicalCode(cleanLabel);
  const codeIsHuman = looksLikeHumanLabel(statusCode);
  const labelIsHuman = looksLikeHumanLabel(cleanLabel);

  // Caso normal: código técnico y etiqueta legible.
  if (codeIsTechnical && labelIsHuman) {
    return cleanLabel;
  }

  // Caso invertido en catálogo: código legible y etiqueta técnica (ej. code="Por desarrollar", label="PDR").
  if (codeIsHuman && labelIsTechnical) {
    return `${statusCode} (${cleanLabel})`;
  }

  if (labelIsHuman) return cleanLabel;
  if (codeIsHuman) return statusCode;

  const fallback = STATUS_NAME_FALLBACK[statusCode.toUpperCase()] ?? STATUS_NAME_FALLBACK[cleanLabel.toUpperCase()];
  if (fallback) {
    const technical = codeIsTechnical ? statusCode : cleanLabel;
    return `${fallback} (${technical})`;
  }

  return cleanLabel;
}
