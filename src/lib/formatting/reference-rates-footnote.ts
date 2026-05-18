import type { FinancialReferenceRates } from "@/types/domain";

/** Texto breve para pie de tablas de facturación (valores editables en configuración). */
export function formatFinancialReferenceRatesFootnote(rates: FinancialReferenceRates): string {
  const uf = rates.ufToClp.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  const usd = rates.usdToClp.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `Tasas de referencia: 1 UF = ${uf} CLP · 1 USD = ${usd} CLP. Se aplican para mostrar el equivalente CLP en reportes y en esta tabla cuando la tarifa del perfil está en UF o USD.`;
}
