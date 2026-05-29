import type { ContractBudget, Requirement, TimeEntry, User } from "@/types/domain";

export type ReportFilterParams = {
  from: string;
  to: string;
  clientId: string;
  projectId: string;
};

export function normalizeReportDateRange(from: string, to: string): { from: string; to: string } {
  if (from > to) return { from: to, to: from };
  return { from, to };
}

export function defaultReportDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function entryDateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function resolveEntryClientKey(
  entry: TimeEntry,
  requirementById: Map<string, Requirement>,
  contractById: Map<string, ContractBudget>,
): string {
  if (entry.clientId) return entry.clientId;
  if (entry.requirementId) {
    const req = requirementById.get(entry.requirementId);
    if (req) return req.clientId;
  }
  if (entry.contractId) {
    const contract = contractById.get(entry.contractId);
    if (contract) return contract.clientId;
  }
  return "__no_req__";
}

export function resolveEntryProjectId(
  entry: TimeEntry,
  requirementById: Map<string, Requirement>,
): string | null {
  if (entry.requirementId) {
    return requirementById.get(entry.requirementId)?.projectId ?? entry.projectId ?? null;
  }
  return entry.projectId || null;
}

export function resolveEntryProfileId(entry: TimeEntry, userById: Map<string, User>): string {
  if (entry.contractProfileId) return entry.contractProfileId;
  const user = userById.get(entry.userId);
  return user?.profileId ?? "sin-perfil";
}

export function filterEntriesForReport(
  entries: TimeEntry[],
  requirements: Requirement[],
  contracts: ContractBudget[],
  filters: ReportFilterParams,
): TimeEntry[] {
  const requirementById = new Map(requirements.map((r) => [r.id, r]));
  const contractById = new Map(contracts.map((c) => [c.id, c]));
  const { from, to, clientId, projectId } = filters;

  return entries.filter((entry) => {
    if (!entryDateInRange(entry.date, from, to)) return false;

    const clientKey = resolveEntryClientKey(entry, requirementById, contractById);
    if (clientId && clientKey !== clientId) return false;

    if (projectId) {
      const entryProjectId = resolveEntryProjectId(entry, requirementById);
      if (entryProjectId !== projectId) return false;
    }

    return true;
  });
}
