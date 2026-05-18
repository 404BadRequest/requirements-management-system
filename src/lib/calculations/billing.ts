import type { Client, FinancialReferenceRates, Profile, Requirement, TimeEntry, User } from "@/types/domain";
import { convertBillingAmountToClp } from "@/lib/calculations/currency-to-clp";

/**
 * Monto lineal: horas × tarifa.
 * Sin conversión de moneda ni UF→CLP aquí (eso es responsabilidad de integración posterior).
 */
export const calculateBillingAmount = (hours: number, hourlyRate: number): number => hours * hourlyRate;

export interface BillingEstimateRow {
  client: string;
  currency: string;
  amount: number;
  /** Equivalente CLP cuando existen tasas de referencia y la moneda es CLP, UF o USD. */
  amountClp: number | null;
}

function clientDisplayName(requirement: Requirement | undefined, clientsById: Map<string, Client>): string {
  if (!requirement?.clientId) return "Sin cliente asignado";
  return clientsById.get(requirement.clientId)?.name ?? requirement.clientId;
}

/**
 * Suma (horas × tarifa del usuario que imputó) por cliente final y por moneda/unidad de tarifa.
 * `amountClp` usa las tasas de referencia para CLP, UF y USD; otras monedas devuelven `amountClp: null`.
 */
export function aggregateBillingEstimateByClient(
  entries: TimeEntry[],
  requirementById: Map<string, Requirement>,
  userById: Map<string, User>,
  profileById: Map<string, Profile>,
  clientsById: Map<string, Client>,
  referenceRates: FinancialReferenceRates,
): BillingEstimateRow[] {
  const acc = new Map<string, Map<string, number>>();

  for (const entry of entries) {
    const user = userById.get(entry.userId);
    if (!user) continue;

    const profile = profileById.get(user.profileId);
    if (!profile) continue;

    const hours = entry.durationMinutes / 60;
    const line = calculateBillingAmount(hours, profile.hourlyRate);

    const clientLabel = entry.requirementId
      ? clientDisplayName(requirementById.get(entry.requirementId), clientsById)
      : "Sin cliente asignado";

    const currency = (profile.rateCurrency ?? "CLP").trim() || "CLP";

    let byCurrency = acc.get(clientLabel);
    if (!byCurrency) {
      byCurrency = new Map();
      acc.set(clientLabel, byCurrency);
    }
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + line);
  }

  const rows: BillingEstimateRow[] = [];
  const clients = [...acc.keys()].sort((a, b) => a.localeCompare(b, "es"));
  for (const client of clients) {
    const inner = acc.get(client);
    if (!inner) continue;
    const currencies = [...inner.keys()].sort((a, b) => a.localeCompare(b, "es"));
    for (const currency of currencies) {
      const amount = inner.get(currency) ?? 0;
      const amountClp = convertBillingAmountToClp(amount, currency, referenceRates);
      rows.push({ client, currency, amount, amountClp });
    }
  }

  return rows;
}
