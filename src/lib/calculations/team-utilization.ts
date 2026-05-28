import type { UtilizationData } from "@/components/reports/utilization-panel";
import type { Profile, TimeEntry, User } from "@/types/domain";

export function defaultTeamDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function normalizeDateRange(from: string, to: string): { from: string; to: string } {
  if (from > to) return { from: to, to: from };
  return { from, to };
}

export function thisWeekDateRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return {
    from: monday.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function lastMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function periodCapacityHours(from: string, to: string, weeklyCapacityHours: number): number {
  const periodMs = Math.max(1, new Date(to).getTime() - new Date(from).getTime() + 86400000);
  const periodWeeks = periodMs / (7 * 24 * 3600 * 1000);
  return Math.round(periodWeeks * weeklyCapacityHours);
}

export function filterEntriesByDateRange(entries: TimeEntry[], from: string, to: string): TimeEntry[] {
  return entries.filter((entry) => entry.date >= from && entry.date <= to);
}

export function sumMinutesByUser(entries: TimeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.userId, (map.get(entry.userId) ?? 0) + entry.durationMinutes);
  }
  return map;
}

export function buildTeamUtilizationData(
  users: User[],
  minutesByUser: Map<string, number>,
  profiles: Profile[],
  capacityHours: number,
  options?: { activeOnly?: boolean; includeZeroHours?: boolean },
): UtilizationData[] {
  const profileNameById = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const activeOnly = options?.activeOnly ?? true;
  const includeZeroHours = options?.includeZeroHours ?? true;

  return users
    .filter((user) => {
      if (activeOnly && !user.active) return false;
      const minutes = minutesByUser.get(user.id) ?? 0;
      if (!includeZeroHours && minutes === 0) return false;
      return true;
    })
    .map((user) => ({
      userId: user.id,
      userName: user.name,
      role: profileNameById.get(user.profileId) ?? user.role,
      loggedHours: (minutesByUser.get(user.id) ?? 0) / 60,
      capacityHours,
    }))
    .sort((a, b) => b.loggedHours - a.loggedHours);
}

export type TeamSummaryKpis = {
  activePeople: number;
  averageUtilizationPercent: number;
  overloadedCount: number;
  underutilizedCount: number;
};

export function computeTeamSummaryKpis(
  utilizationData: UtilizationData[],
  activePeople: number,
): TeamSummaryKpis {
  if (utilizationData.length === 0) {
    return {
      activePeople,
      averageUtilizationPercent: 0,
      overloadedCount: 0,
      underutilizedCount: 0,
    };
  }

  let totalUtil = 0;
  let overloadedCount = 0;
  let underutilizedCount = 0;

  for (const item of utilizationData) {
    const utilization = item.capacityHours > 0 ? item.loggedHours / item.capacityHours : 0;
    totalUtil += utilization;
    if (utilization > 1.0) overloadedCount++;
    else if (utilization < 0.6) underutilizedCount++;
  }

  return {
    activePeople,
    averageUtilizationPercent: Math.round((totalUtil / utilizationData.length) * 100),
    overloadedCount,
    underutilizedCount,
  };
}
