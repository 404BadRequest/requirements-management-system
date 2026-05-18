"use server";

import { createBudget, getBudgets, getCatalogByKind, getProfiles, getTimeEntries } from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import type { SettingsCatalogEntry } from "@/types/domain";
import type { BudgetInput } from "@/schemas/budget-schema";
import { calculateBudgetUsedMinutes } from "@/lib/calculations/budget";

export async function loadBudgetsPageData(projectId?: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.read");
  const [budgetsData, profilesData, entries, scopeRows] = await Promise.all([
    getBudgets(),
    getProfiles(),
    getTimeEntries(),
    getCatalogByKind("budget_scope"),
  ]);
  const pid = projectId?.trim() || undefined;
  const budgetsFiltered = pid ? budgetsData.filter((b) => b.projectId === pid) : budgetsData;
  const entriesFiltered = pid ? entries.filter((e) => e.projectId === pid) : entries;
  return {
    budgets: budgetsFiltered,
    profiles: profilesData,
    scopes: scopeRows as SettingsCatalogEntry[],
    usedMinutes: calculateBudgetUsedMinutes(entriesFiltered),
  };
}

export async function createBudgetAction(values: BudgetInput) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "budgets.write");
  return createBudget(values);
}
