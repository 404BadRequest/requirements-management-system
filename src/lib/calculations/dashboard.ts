import {
  budgetRiskLevel,
  calculateBudgetAvailableMinutes,
  calculateBudgetQuotedMinutes,
  calculateBudgetUsedMinutes,
  calculateConsumptionPercentage,
} from "@/lib/calculations/budget";
import { aggregateBillingEstimateByClient } from "@/lib/calculations/billing";
import { groupHoursByCategory, groupHoursByMonth, groupHoursByPerson } from "@/lib/calculations/time";
import type { BudgetAllocation, Client, ContractBudget, FinancialReferenceRates, Profile, Requirement, TimeEntry, User } from "@/types/domain";

export type DashboardMetricsContext = {
  users?: User[];
  profiles?: Profile[];
  clients?: Client[];
  contracts?: ContractBudget[];
  referenceRates?: FinancialReferenceRates;
};

function resolveClientLabel(input: {
  entry: TimeEntry;
  requirementById: Map<string, Requirement>;
  clientsById: Map<string, Client>;
  contractById?: Map<string, ContractBudget>;
}): string {
  const requirementClientId = input.entry.requirementId ? input.requirementById.get(input.entry.requirementId)?.clientId : null;
  if (requirementClientId) {
    return input.clientsById.get(requirementClientId)?.name ?? requirementClientId;
  }

  const contractClientId = input.entry.contractId ? input.contractById?.get(input.entry.contractId)?.clientId : null;
  if (contractClientId) {
    return input.clientsById.get(contractClientId)?.name ?? contractClientId;
  }

  return "Sin cliente asignado";
}

export const calculateDashboardMetrics = (
  requirements: Requirement[],
  entries: TimeEntry[],
  budgets: BudgetAllocation[],
  context?: DashboardMetricsContext,
) => {
  const requirementById = new Map(requirements.map((item) => [item.id, item]));
  const clientsById = new Map((context?.clients ?? []).map((c) => [c.id, c]));
  const contractById = context?.contracts?.length ? new Map(context.contracts.map((c) => [c.id, c])) : undefined;

  const totalRequirements = requirements.length;
  const openRequirements = requirements.filter((item) => item.status !== "DONE_PROD").length;
  const completedRequirements = requirements.filter((item) => item.status === "DONE_PROD").length;
  const byStatus = requirements.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  const byPriority = requirements.reduce<Record<string, number>>((acc, item) => {
    acc[item.priority] = (acc[item.priority] ?? 0) + 1;
    return acc;
  }, {});

  const usedMinutes = calculateBudgetUsedMinutes(entries);
  const quotedMinutes = calculateBudgetQuotedMinutes(budgets);
  const availableMinutes = calculateBudgetAvailableMinutes(quotedMinutes, usedMinutes);
  const consumptionPercentage = calculateConsumptionPercentage(quotedMinutes, usedMinutes);
  const openTimeEntriesCount = entries.filter((entry) => !entry.endTime).length;
  const hoursWithoutRequirementMinutes = entries
    .filter((entry) => !entry.requirementId)
    .reduce((acc, entry) => acc + entry.durationMinutes, 0);

  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const weekStart = new Date(`${todayDate}T12:00:00.000Z`);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartDate = weekStart.toISOString().slice(0, 10);
  const hoursThisWeekMinutes = entries
    .filter((entry) => entry.date >= weekStartDate && entry.date <= todayDate)
    .reduce((acc, entry) => acc + entry.durationMinutes, 0);
  const completedLast7Days = requirements.filter((item) => {
    if (item.status !== "DONE_PROD" || !item.completedAt) return false;
    const completedDate = item.completedAt.slice(0, 10);
    return completedDate >= weekStartDate && completedDate <= todayDate;
  }).length;
  const hoursByClient = entries.reduce<Record<string, number>>((acc, entry) => {
    const label = resolveClientLabel({ entry, requirementById, clientsById, contractById });
    acc[label] = (acc[label] ?? 0) + entry.durationMinutes;
    return acc;
  }, {});

  let billingEstimateByClient: ReturnType<typeof aggregateBillingEstimateByClient> = [];
  if (context?.users?.length && context?.profiles?.length && context?.clients?.length && context.referenceRates) {
    const userById = new Map(context.users.map((u) => [u.id, u]));
    const profileById = new Map(context.profiles.map((p) => [p.id, p]));
    billingEstimateByClient = aggregateBillingEstimateByClient(
      entries,
      requirementById,
      userById,
      profileById,
      clientsById,
      context.referenceRates,
      contractById,
    );
  }

  const hoursByPersonMinutes = groupHoursByPerson(entries);
  const hoursByPerson: Record<string, number> = {};
  if (context?.users?.length) {
    const userById = new Map(context.users.map((u) => [u.id, u]));
    for (const [userId, minutes] of Object.entries(hoursByPersonMinutes)) {
      const label = userById.get(userId)?.name ?? userId;
      hoursByPerson[label] = (hoursByPerson[label] ?? 0) + minutes;
    }
  } else {
    Object.assign(hoursByPerson, hoursByPersonMinutes);
  }

  // Calcular métricas de salud por proyecto/cliente
  const projectHealthData = [];
  if (context?.clients?.length) {
    for (const client of context.clients) {
      if (!client.active) continue;
      
      const clientReqs = requirements.filter(r => r.clientId === client.id);
      const clientEntries = entries.filter(e => {
        if (e.clientId === client.id) return true;
        if (e.requirementId) {
          const req = requirementById.get(e.requirementId);
          return req?.clientId === client.id;
        }
        if (e.contractId && contractById) {
          const contract = contractById.get(e.contractId);
          return contract?.clientId === client.id;
        }
        return false;
      });
      
      const clientBudgets = budgets.filter(b => {
        const contract = contractById?.get(b.projectId); // En este contexto projectId de budget es contractId
        return contract?.clientId === client.id;
      });

      const clientUsedMinutes = calculateBudgetUsedMinutes(clientEntries);
      const clientQuotedMinutes = calculateBudgetQuotedMinutes(clientBudgets);
      const clientConsumptionPercentage = calculateConsumptionPercentage(clientQuotedMinutes, clientUsedMinutes);
      
      const clientHoursWithoutReq = clientEntries
        .filter(e => !e.requirementId)
        .reduce((acc, e) => acc + e.durationMinutes, 0) / 60;
        
      const blockedReqs = clientReqs.filter(r => r.status === "BLOCKED").length;
      
      let oldestDays = 0;
      const openClientReqs = clientReqs.filter(r => r.status !== "DONE_PROD");
      if (openClientReqs.length > 0) {
        const oldestDate = new Date(Math.min(...openClientReqs.map(r => new Date(r.createdAt).getTime())));
        oldestDays = Math.floor((new Date().getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (clientReqs.length > 0 || clientEntries.length > 0 || clientBudgets.length > 0) {
        projectHealthData.push({
          clientId: client.id,
          clientName: client.name,
          consumptionPercentage: clientConsumptionPercentage,
          hoursWithoutRequirement: clientHoursWithoutReq,
          oldestRequirementDays: oldestDays,
          blockedRequirements: blockedReqs,
        });
      }
    }
  }

  return {
    totalRequirements,
    openRequirements,
    completedRequirements,
    byStatus,
    byPriority,
    totalHours: usedMinutes / 60,
    availableHours: availableMinutes / 60,
    consumptionPercentage,
    risk: budgetRiskLevel(quotedMinutes, usedMinutes),
    hoursByMonth: groupHoursByMonth(entries),
    hoursByPerson,
    hoursByCategory: groupHoursByCategory(entries),
    hoursByClient,
    billingEstimateByClient,
    projectHealthData,
    roleViews: {
      adminView: {
        kpis: {
          totalRequirements,
          openRequirements,
          totalHours: usedMinutes / 60,
          consumptionPercentage,
        },
      },
      pmView: {
        kpis: {
          openRequirements,
          completedLast7Days,
          openTimeEntriesCount,
          hoursWithoutRequirement: hoursWithoutRequirementMinutes / 60,
        },
      },
      contributorView: {
        kpis: {
          hoursThisWeek: hoursThisWeekMinutes / 60,
          openTimeEntriesCount,
          activeRequirements: openRequirements,
          hoursWithoutRequirement: hoursWithoutRequirementMinutes / 60,
        },
      },
    },
    openTimeEntriesCount,
    hoursWithoutRequirement: hoursWithoutRequirementMinutes / 60,
    hoursThisWeek: hoursThisWeekMinutes / 60,
    completedLast7Days,
  };
};
