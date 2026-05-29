import type {
  Client,
  ContractBudget,
  FinancialReferenceRates,
  Profile,
  Project,
  Requirement,
  TimeEntry,
  User,
} from "@/types/domain";
import { calculateBillingAmount } from "@/lib/calculations/billing";
import { convertBillingAmountToClp } from "@/lib/calculations/currency-to-clp";
import { formatBillingLineTotal } from "@/lib/formatting/rates";
import {
  filterEntriesForReport,
  resolveEntryProfileId,
  resolveEntryProjectId,
  type ReportFilterParams,
} from "@/lib/reports/report-filters";
import { computeLineValuation } from "@/lib/reports/report-valuation";

export type ContractValuationRow = {
  id: string;
  contractId: string;
  contractCode: string;
  contractName: string;
  clientName: string;
  projectId: string | null;
  projectName: string;
  hours: number;
  hoursDisplay: string;
  costClp: number;
  costClpDisplay: string;
  markupPercentage: number;
  revenueClp: number;
  revenueClpDisplay: string;
  opexPercentage: number;
  opexAmountClp: number;
  opexAmountClpDisplay: string;
  marginClp: number;
  marginClpDisplay: string;
  marginPercentage: number;
  marginPercentageDisplay: string;
  valuationSummary: string;
};

export type ProjectValuationRow = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  hours: number;
  hoursDisplay: string;
  costClp: number;
  costClpDisplay: string;
  revenueClp: number;
  revenueClpDisplay: string;
  opexAmountClp: number;
  opexAmountClpDisplay: string;
  marginClp: number;
  marginClpDisplay: string;
  marginPercentage: number;
  marginPercentageDisplay: string;
  contractCount: number;
  valuationSummary: string;
};

export type ValuationSummaryKpis = {
  totalHours: number;
  totalHoursDisplay: string;
  totalCostClp: number;
  totalCostClpDisplay: string;
  totalRevenueClp: number;
  totalRevenueClpDisplay: string;
  totalOpexClp: number;
  totalOpexClpDisplay: string;
  totalMarginClp: number;
  totalMarginClpDisplay: string;
  globalMarginPercentage: number;
  globalMarginPercentageDisplay: string;
};

export type BuildContractValuationParams = {
  entries: TimeEntry[];
  requirements: Requirement[];
  users: User[];
  profiles: Profile[];
  clients: Client[];
  projects: Project[];
  contracts: ContractBudget[];
  filters: ReportFilterParams;
  referenceRates: FinancialReferenceRates;
};

function formatHours(hours: number): string {
  return `${hours.toFixed(2)} h`;
}

function buildValuationSummary(
  hours: number,
  costClp: number,
  revenueClp: number,
  opexClp: number,
  marginClp: number,
): string {
  return `${formatHours(hours)} registradas equivalen a ${formatBillingLineTotal(costClp, "CLP")} de costo directo; venta estimada ${formatBillingLineTotal(revenueClp, "CLP")}; OPEX ${formatBillingLineTotal(opexClp, "CLP")}; margen neto ${formatBillingLineTotal(marginClp, "CLP")}.`;
}

function resolveProfileForEntry(
  entry: TimeEntry,
  userById: Map<string, User>,
  profileById: Map<string, Profile>,
): Profile | undefined {
  const profileId = resolveEntryProfileId(entry, userById);
  return profileById.get(profileId);
}

function computeEntryCostClp(
  entry: TimeEntry,
  userById: Map<string, User>,
  profileById: Map<string, Profile>,
  referenceRates: FinancialReferenceRates,
): number | null {
  const profile = resolveProfileForEntry(entry, userById, profileById);
  if (!profile) return null;
  const hours = entry.durationMinutes / 60;
  const amount = calculateBillingAmount(hours, profile.hourlyRate);
  const currency = (profile.rateCurrency ?? "CLP").trim() || "CLP";
  return convertBillingAmountToClp(amount, currency, referenceRates);
}

export function buildContractValuationReport(params: BuildContractValuationParams): ContractValuationRow[] {
  const filtered = filterEntriesForReport(params.entries, params.requirements, params.contracts, params.filters);
  const userById = new Map(params.users.map((u) => [u.id, u]));
  const profileById = new Map(params.profiles.map((p) => [p.id, p]));
  const clientById = new Map(params.clients.map((c) => [c.id, c]));
  const contractById = new Map(params.contracts.map((c) => [c.id, c]));
  const projectById = new Map(params.projects.map((p) => [p.id, p]));

  type Agg = { minutes: number; costClp: number; revenueClp: number; opexClp: number; marginClp: number };
  const agg = new Map<string, Agg>();

  for (const entry of filtered) {
    if (!entry.contractId) continue;
    const costClp = computeEntryCostClp(entry, userById, profileById, params.referenceRates);
    if (costClp === null) continue;

    const contract = contractById.get(entry.contractId);
    const markup = contract?.markupPercentage ?? 40;
    const opex = contract?.opexPercentage ?? 10;
    const valuation = computeLineValuation(costClp, markup, opex);

    const prev = agg.get(entry.contractId) ?? { minutes: 0, costClp: 0, revenueClp: 0, opexClp: 0, marginClp: 0 };
    prev.minutes += entry.durationMinutes;
    prev.costClp += costClp;
    prev.revenueClp += valuation.revenueClp;
    prev.opexClp += valuation.opexAmountClp;
    prev.marginClp += valuation.marginClp;
    agg.set(entry.contractId, prev);
  }

  const rows: ContractValuationRow[] = [];

  for (const [contractId, data] of agg) {
    const contract = contractById.get(contractId);
    if (!contract) continue;
    const hours = data.minutes / 60;
    const clientName = clientById.get(contract.clientId)?.name ?? contract.clientId;
    const project = projectById.get(contract.projectId);
    const marginPercentage = data.revenueClp > 0 ? (data.marginClp / data.revenueClp) * 100 : 0;

    rows.push({
      id: contractId,
      contractId,
      contractCode: contract.code,
      contractName: contract.name,
      clientName,
      projectId: contract.projectId,
      projectName: project?.name ?? contract.projectId,
      hours,
      hoursDisplay: formatHours(hours),
      costClp: data.costClp,
      costClpDisplay: formatBillingLineTotal(data.costClp, "CLP"),
      markupPercentage: contract.markupPercentage,
      revenueClp: data.revenueClp,
      revenueClpDisplay: formatBillingLineTotal(data.revenueClp, "CLP"),
      opexPercentage: contract.opexPercentage,
      opexAmountClp: data.opexClp,
      opexAmountClpDisplay: formatBillingLineTotal(data.opexClp, "CLP"),
      marginClp: data.marginClp,
      marginClpDisplay: formatBillingLineTotal(data.marginClp, "CLP"),
      marginPercentage,
      marginPercentageDisplay: `${marginPercentage.toFixed(1)}%`,
      valuationSummary: buildValuationSummary(hours, data.costClp, data.revenueClp, data.opexClp, data.marginClp),
    });
  }

  return rows.sort((a, b) => b.hours - a.hours);
}

export function buildProjectValuationReport(params: BuildContractValuationParams): ProjectValuationRow[] {
  const filtered = filterEntriesForReport(params.entries, params.requirements, params.contracts, params.filters);
  const userById = new Map(params.users.map((u) => [u.id, u]));
  const profileById = new Map(params.profiles.map((p) => [p.id, p]));
  const clientById = new Map(params.clients.map((c) => [c.id, c]));
  const contractById = new Map(params.contracts.map((c) => [c.id, c]));
  const projectById = new Map(params.projects.map((p) => [p.id, p]));
  const requirementById = new Map(params.requirements.map((r) => [r.id, r]));

  type Agg = {
    minutes: number;
    costClp: number;
    revenueClp: number;
    opexClp: number;
    marginClp: number;
    contracts: Set<string>;
  };
  const agg = new Map<string, Agg>();

  for (const entry of filtered) {
    const projectId = resolveEntryProjectId(entry, requirementById) ?? "__sin_proyecto__";
    const costClp = computeEntryCostClp(entry, userById, profileById, params.referenceRates);
    if (costClp === null) continue;

    let revenueClp = costClp;
    let opexClp = 0;
    let marginClp = 0;

    if (entry.contractId) {
      const contract = contractById.get(entry.contractId);
      const markup = contract?.markupPercentage ?? 40;
      const opex = contract?.opexPercentage ?? 10;
      const valuation = computeLineValuation(costClp, markup, opex);
      revenueClp = valuation.revenueClp;
      opexClp = valuation.opexAmountClp;
      marginClp = valuation.marginClp;
    }

    const prev = agg.get(projectId) ?? {
      minutes: 0,
      costClp: 0,
      revenueClp: 0,
      opexClp: 0,
      marginClp: 0,
      contracts: new Set<string>(),
    };
    prev.minutes += entry.durationMinutes;
    prev.costClp += costClp;
    prev.revenueClp += revenueClp;
    prev.opexClp += opexClp;
    prev.marginClp += marginClp;
    if (entry.contractId) prev.contracts.add(entry.contractId);
    agg.set(projectId, prev);
  }

  const rows: ProjectValuationRow[] = [];

  for (const [projectId, data] of agg) {
    const project = projectById.get(projectId);
    const hours = data.minutes / 60;
    const reqClientId = projectId !== "__sin_proyecto__"
      ? params.requirements.find((r) => r.projectId === projectId)?.clientId
      : undefined;
    const clientName = reqClientId ? (clientById.get(reqClientId)?.name ?? "—") : project?.clientName ?? "—";
    const marginPercentage = data.revenueClp > 0 ? (data.marginClp / data.revenueClp) * 100 : 0;

    rows.push({
      id: projectId,
      projectId,
      projectCode: project?.code ?? (projectId === "__sin_proyecto__" ? "—" : projectId),
      projectName: project?.name ?? (projectId === "__sin_proyecto__" ? "Sin proyecto" : projectId),
      clientName,
      hours,
      hoursDisplay: formatHours(hours),
      costClp: data.costClp,
      costClpDisplay: formatBillingLineTotal(data.costClp, "CLP"),
      revenueClp: data.revenueClp,
      revenueClpDisplay: formatBillingLineTotal(data.revenueClp, "CLP"),
      opexAmountClp: data.opexClp,
      opexAmountClpDisplay: formatBillingLineTotal(data.opexClp, "CLP"),
      marginClp: data.marginClp,
      marginClpDisplay: formatBillingLineTotal(data.marginClp, "CLP"),
      marginPercentage,
      marginPercentageDisplay: `${marginPercentage.toFixed(1)}%`,
      contractCount: data.contracts.size,
      valuationSummary: buildValuationSummary(hours, data.costClp, data.revenueClp, data.opexClp, data.marginClp),
    });
  }

  return rows.sort((a, b) => b.hours - a.hours);
}

export function summarizeValuationReport(
  contractRows: ContractValuationRow[],
): ValuationSummaryKpis {
  const totalHours = contractRows.reduce((acc, row) => acc + row.hours, 0);
  const totalCostClp = contractRows.reduce((acc, row) => acc + row.costClp, 0);
  const totalRevenueClp = contractRows.reduce((acc, row) => acc + row.revenueClp, 0);
  const totalOpexClp = contractRows.reduce((acc, row) => acc + row.opexAmountClp, 0);
  const totalMarginClp = contractRows.reduce((acc, row) => acc + row.marginClp, 0);
  const globalMarginPercentage = totalRevenueClp > 0 ? (totalMarginClp / totalRevenueClp) * 100 : 0;

  return {
    totalHours,
    totalHoursDisplay: formatHours(totalHours),
    totalCostClp,
    totalCostClpDisplay: formatBillingLineTotal(totalCostClp, "CLP"),
    totalRevenueClp,
    totalRevenueClpDisplay: formatBillingLineTotal(totalRevenueClp, "CLP"),
    totalOpexClp,
    totalOpexClpDisplay: formatBillingLineTotal(totalOpexClp, "CLP"),
    totalMarginClp,
    totalMarginClpDisplay: formatBillingLineTotal(totalMarginClp, "CLP"),
    globalMarginPercentage,
    globalMarginPercentageDisplay: `${globalMarginPercentage.toFixed(1)}%`,
  };
}
