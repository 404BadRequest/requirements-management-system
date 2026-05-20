import {
  budgetRiskLevel,
  calculateBudgetAvailableMinutes,
  calculateBudgetQuotedMinutes,
  calculateBudgetUsedMinutes,
  calculateConsumptionPercentage,
} from "@/lib/calculations/budget";
import { aggregateBillingEstimateByClient } from "@/lib/calculations/billing";
import { groupHoursByCategory, groupHoursByMonth, groupHoursByPerson } from "@/lib/calculations/time";
import type { BudgetAllocation, Client, FinancialReferenceRates, Profile, Requirement, TimeEntry, User } from "@/types/domain";

export type DashboardMetricsContext = {
  users?: User[];
  profiles?: Profile[];
  clients?: Client[];
  referenceRates?: FinancialReferenceRates;
};

function clientLabelForRequirement(
  requirement: Requirement | undefined,
  clientsById: Map<string, Client>,
): string {
  if (!requirement?.clientId) return "Sin cliente asignado";
  return clientsById.get(requirement.clientId)?.name ?? requirement.clientId;
}

export const calculateDashboardMetrics = (
  requirements: Requirement[],
  entries: TimeEntry[],
  budgets: BudgetAllocation[],
  context?: DashboardMetricsContext,
) => {
  const requirementById = new Map(requirements.map((item) => [item.id, item]));
  const clientsById = new Map((context?.clients ?? []).map((c) => [c.id, c]));

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
    if (!entry.requirementId) {
      acc["Sin cliente asignado"] = (acc["Sin cliente asignado"] ?? 0) + entry.durationMinutes;
      return acc;
    }

    const requirement = requirementById.get(entry.requirementId);
    const label = clientLabelForRequirement(requirement, clientsById);
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
