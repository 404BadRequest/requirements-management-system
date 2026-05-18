import type { Client, FinancialReferenceRates, Profile, Requirement, TimeEntry, User } from "@/types/domain";
import { calculateBillingAmount } from "@/lib/calculations/billing";
import { convertBillingAmountToClp } from "@/lib/calculations/currency-to-clp";
import { formatBillingLineTotal } from "@/lib/formatting/rates";

export type SpendReportRow = {
  id: string;
  clientName: string;
  userName: string;
  categoryCode: string;
  categoryLabel: string;
  hours: number;
  hoursDisplay: string;
  billable: boolean;
  amount: number | null;
  currency: string;
  amountDisplay: string;
  /** CLP usando tasas de referencia (CLP, UF y USD); otras monedas → null. */
  amountClp: number | null;
  amountClpDisplay: string;
};

export type BuildSpendReportParams = {
  entries: TimeEntry[];
  requirements: Requirement[];
  users: User[];
  profiles: Profile[];
  clients: Client[];
  categoryLabelByCode: Map<string, string>;
  fromDate: string;
  toDate: string;
  /** Vacío: todos los clientes (incluye horas sin REQ como “Sin requerimiento”). */
  clientIdFilter: string;
  /** Vacío: todos los proyectos (según `project_id` de la hora o del requerimiento vinculado). */
  projectIdFilter: string;
  referenceRates: FinancialReferenceRates;
};

function entryDateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function buildSpendReport(params: BuildSpendReportParams): SpendReportRow[] {
  const {
    entries,
    requirements,
    users,
    profiles,
    clients,
    categoryLabelByCode,
    fromDate,
    toDate,
    clientIdFilter,
    projectIdFilter,
    referenceRates,
  } = params;

  const requirementById = new Map(requirements.map((r) => [r.id, r]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const clientById = new Map(clients.map((c) => [c.id, c]));

  type Agg = { minutes: number };
  const agg = new Map<string, Agg>();

  for (const entry of entries) {
    if (!entryDateInRange(entry.date, fromDate, toDate)) continue;

    let clientKey: string;

    if (!entry.requirementId) {
      clientKey = "__no_req__";
    } else {
      const req = requirementById.get(entry.requirementId);
      if (!req) continue;
      clientKey = req.clientId;
    }

    if (clientIdFilter && clientKey !== clientIdFilter) continue;

    if (projectIdFilter) {
      const entryProjectId = entry.requirementId
        ? requirementById.get(entry.requirementId)?.projectId
        : entry.projectId;
      if (entryProjectId !== projectIdFilter) continue;
    }

    const user = userById.get(entry.userId);
    if (!user) continue;

    const composite = `${clientKey}|${entry.userId}|${entry.category}`;
    const prev = agg.get(composite);
    const minutes = entry.durationMinutes;
    if (prev) {
      prev.minutes += minutes;
    } else {
      agg.set(composite, { minutes });
    }
  }

  const rows: SpendReportRow[] = [];

  for (const [key, data] of agg) {
    const parts = key.split("|");
    const clientKeyPart = parts[0] ?? "";
    const userId = parts[1] ?? "";
    const categoryCode = parts.slice(2).join("|");
    const user = userById.get(userId);
    if (!user) continue;

    const profile = profileById.get(user.profileId);
    const hours = data.minutes / 60;
    const categoryLabel = categoryLabelByCode.get(categoryCode) ?? categoryCode;

    const clientName =
      clientKeyPart === "__no_req__"
        ? "Sin requerimiento asociado"
        : clientById.get(clientKeyPart)?.name ?? clientKeyPart;

    const billable = Boolean(profile);
    const currency = (profile?.rateCurrency ?? "CLP").trim() || "CLP";
    const amount = profile ? calculateBillingAmount(hours, profile.hourlyRate) : null;
    const amountDisplay = amount !== null ? formatBillingLineTotal(amount, currency) : "—";

    const amountClp = amount !== null ? convertBillingAmountToClp(amount, currency, referenceRates) : null;
    const amountClpDisplay = amountClp !== null ? formatBillingLineTotal(amountClp, "CLP") : "—";

    rows.push({
      id: key,
      clientName,
      userName: user.name,
      categoryCode,
      categoryLabel,
      hours,
      hoursDisplay: `${hours.toFixed(1)} h`,
      billable,
      amount,
      currency,
      amountDisplay,
      amountClp,
      amountClpDisplay,
    });
  }

  rows.sort((a, b) => {
    const c = a.clientName.localeCompare(b.clientName, "es");
    if (c !== 0) return c;
    const u = a.userName.localeCompare(b.userName, "es");
    if (u !== 0) return u;
    return a.categoryLabel.localeCompare(b.categoryLabel, "es");
  });

  return rows;
}

export function summarizeSpendReport(rows: SpendReportRow[]): {
  totalHours: number;
  /** Totales solo de filas con tarifa de perfil (importe facturable). */
  totalsByCurrency: { currency: string; amount: number; display: string }[];
  /** Suma de equivalentes CLP (solo filas con conversión definida). */
  totalClpConverted: number;
  totalClpDisplay: string;
  /** Hay líneas facturables en moneda no convertible (no entran en el total CLP). */
  hasExcludedFromClpTotal: boolean;
} {
  const totalHours = rows.reduce((acc, r) => acc + r.hours, 0);
  const byCur = new Map<string, number>();
  let totalClpConverted = 0;
  let hasExcludedFromClpTotal = false;

  for (const r of rows) {
    if (r.amount == null) continue;
    byCur.set(r.currency, (byCur.get(r.currency) ?? 0) + r.amount);
    if (r.amountClp != null) {
      totalClpConverted += r.amountClp;
    } else if (r.billable) {
      hasExcludedFromClpTotal = true;
    }
  }

  const currencies = [...byCur.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const totalsByCurrency = currencies.map((currency) => {
    const amount = byCur.get(currency) ?? 0;
    return { currency, amount, display: formatBillingLineTotal(amount, currency) };
  });

  const totalClpDisplay = formatBillingLineTotal(totalClpConverted, "CLP");

  return { totalHours, totalsByCurrency, totalClpConverted, totalClpDisplay, hasExcludedFromClpTotal };
}
