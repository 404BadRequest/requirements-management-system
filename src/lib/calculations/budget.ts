import type { BudgetAllocation, TimeEntry } from "@/types/domain";

export const calculateBudgetUsedMinutes = (entries: TimeEntry[]): number =>
  entries.reduce((acc, entry) => acc + entry.durationMinutes, 0);

export const calculateBudgetQuotedMinutes = (allocations: BudgetAllocation[]): number =>
  allocations.reduce((acc, item) => acc + item.quotedMinutes, 0);

export const calculateBudgetAvailableMinutes = (quoted: number, used: number): number => quoted - used;

export const calculateConsumptionPercentage = (quoted: number, used: number): number => {
  if (quoted <= 0) {
    return 0;
  }

  return (used / quoted) * 100;
};

export const detectOverrun = (quoted: number, used: number): boolean => used > quoted;

export const budgetRiskLevel = (quoted: number, used: number): "sin presupuesto" | "verde" | "amarillo" | "rojo" => {
  if (quoted <= 0) {
    return "sin presupuesto";
  }

  const percentage = calculateConsumptionPercentage(quoted, used);

  if (percentage < 80) return "verde";
  if (percentage <= 100) return "amarillo";
  return "rojo";
};
