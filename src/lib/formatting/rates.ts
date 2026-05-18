/**
 * Formato de tarifa horaria para facturación.
 * - CLP: pesos chilenos
 * - UF: unidades de fomento (valor numérico; la conversión a pesos depende del valor UF del día en otro proceso)
 * - Cualquier otra etiqueta: libre para el usuario (USD, EUR, etc.)
 */
export function formatHourlyRateDisplay(rate: number, currency: string): string {
  const trimmed = currency.trim();
  if (trimmed === "CLP" || trimmed === "") {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(rate);
  }
  if (trimmed.toUpperCase() === "UF") {
    const n = Number.isInteger(rate) ? rate.toLocaleString("es-CL") : rate.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return `${n} UF/h`;
  }
  const n = rate.toLocaleString("es-CL", { maximumFractionDigits: 4 });
  return `${n} ${trimmed}/h`;
}

/** Total de una línea de facturación (horas × tarifa), sin conversión entre monedas. */
export function formatBillingLineTotal(amount: number, currency: string): string {
  const trimmed = currency.trim();
  if (trimmed === "CLP" || trimmed === "") {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${amount.toLocaleString("es-CL", { maximumFractionDigits: 2 })} ${trimmed}`;
}
