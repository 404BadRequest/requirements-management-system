import type { FinancialReferenceRates } from "@/types/domain";

/**
 * Convierte un monto ya calculado en la moneda del perfil (p. ej. total UF o total USD) a CLP
 * usando las tasas de referencia configuradas.
 * @returns null si la moneda no es convertible (solo se contemplan CLP, UF y USD).
 */
export function convertBillingAmountToClp(
  amount: number,
  currency: string,
  rates: FinancialReferenceRates,
): number | null {
  const c = currency.trim().toUpperCase();
  if (c === "" || c === "CLP") return amount;
  if (c === "UF") {
    if (!Number.isFinite(rates.ufToClp)) return null;
    return amount * rates.ufToClp;
  }
  if (c === "USD") {
    if (!Number.isFinite(rates.usdToClp)) return null;
    return amount * rates.usdToClp;
  }
  return null;
}
