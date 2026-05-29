import type { Client, ContractBudget, Profile, Project, Requirement, TimeEntry, User } from "@/types/domain";
import {
  filterEntriesForReport,
  resolveEntryProfileId,
  resolveEntryProjectId,
  type ReportFilterParams,
} from "@/lib/reports/report-filters";

export type HoursByProfileRow = {
  id: string;
  profileId: string;
  profileName: string;
  hours: number;
  hoursDisplay: string;
  sharePercent: number;
  sharePercentDisplay: string;
  distinctPeople: number;
  billableHours: number;
  billableHoursDisplay: string;
};

export type HoursByUserRow = {
  id: string;
  userId: string;
  userName: string;
  profileName: string;
  hours: number;
  hoursDisplay: string;
  sharePercent: number;
  sharePercentDisplay: string;
  topCategories: string;
};

export type HoursByProjectRow = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  hours: number;
  hoursDisplay: string;
  sharePercent: number;
  sharePercentDisplay: string;
  requirementCount: number;
  distinctPeople: number;
};

export type HoursByCategoryRow = {
  id: string;
  categoryCode: string;
  categoryLabel: string;
  hours: number;
  hoursDisplay: string;
  sharePercent: number;
  sharePercentDisplay: string;
};

export type HoursReportSummary = {
  totalHours: number;
  totalHoursDisplay: string;
  activePeople: number;
  activeProjects: number;
  billableHours: number;
  nonBillableHours: number;
  billableHoursDisplay: string;
  nonBillableHoursDisplay: string;
  topProfiles: HoursByProfileRow[];
  topUsers: HoursByUserRow[];
  topProjects: HoursByProjectRow[];
  byCategory: HoursByCategoryRow[];
  chartByProfile: { name: string; value: number }[];
  chartByProject: { name: string; value: number }[];
};

export type BuildHoursAggregationsParams = {
  entries: TimeEntry[];
  requirements: Requirement[];
  contracts: ContractBudget[];
  users: User[];
  profiles: Profile[];
  clients: Client[];
  projects: Project[];
  categoryLabelByCode: Map<string, string>;
  filters: ReportFilterParams;
};

function filterForReport(params: BuildHoursAggregationsParams): TimeEntry[] {
  return filterEntriesForReport(params.entries, params.requirements, params.contracts, params.filters);
}

function formatHours(hours: number): string {
  return `${hours.toFixed(2)} h`;
}

function formatShare(hours: number, totalHours: number): { sharePercent: number; sharePercentDisplay: string } {
  const sharePercent = totalHours > 0 ? (hours / totalHours) * 100 : 0;
  return { sharePercent, sharePercentDisplay: `${sharePercent.toFixed(1)}%` };
}

function topCategoryLabels(
  minutesByCategory: Map<string, number>,
  categoryLabelByCode: Map<string, string>,
  limit = 3,
): string {
  return [...minutesByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([code, minutes]) => {
      const label = categoryLabelByCode.get(code) ?? code;
      return `${label} (${(minutes / 60).toFixed(1)} h)`;
    })
    .join(" · ");
}

export function buildHoursByProfile(params: BuildHoursAggregationsParams): HoursByProfileRow[] {
  const filtered = filterForReport(params);
  const userById = new Map(params.users.map((u) => [u.id, u]));
  const profileById = new Map(params.profiles.map((p) => [p.id, p]));

  type Agg = { minutes: number; people: Set<string> };
  const agg = new Map<string, Agg>();

  for (const entry of filtered) {
    const profileId = resolveEntryProfileId(entry, userById);
    const prev = agg.get(profileId) ?? { minutes: 0, people: new Set<string>() };
    prev.minutes += entry.durationMinutes;
    prev.people.add(entry.userId);
    agg.set(profileId, prev);
  }

  const totalMinutes = [...agg.values()].reduce((acc, row) => acc + row.minutes, 0);
  const totalHours = totalMinutes / 60;

  const rows: HoursByProfileRow[] = [...agg.entries()].map(([profileId, data]) => {
    const hours = data.minutes / 60;
    const profile = profileById.get(profileId);
    const billableHours = profile ? hours : 0;
    const { sharePercent, sharePercentDisplay } = formatShare(hours, totalHours);
    return {
      id: profileId,
      profileId,
      profileName: profile?.name ?? (profileId === "sin-perfil" ? "Sin perfil" : profileId),
      hours,
      hoursDisplay: formatHours(hours),
      sharePercent,
      sharePercentDisplay,
      distinctPeople: data.people.size,
      billableHours,
      billableHoursDisplay: formatHours(billableHours),
    };
  });

  return rows.sort((a, b) => b.hours - a.hours);
}

export function buildHoursByUser(params: BuildHoursAggregationsParams): HoursByUserRow[] {
  const filtered = filterForReport(params);
  const userById = new Map(params.users.map((u) => [u.id, u]));
  const profileById = new Map(params.profiles.map((p) => [p.id, p]));

  type Agg = { minutes: number; categories: Map<string, number> };
  const agg = new Map<string, Agg>();

  for (const entry of filtered) {
    const prev = agg.get(entry.userId) ?? { minutes: 0, categories: new Map<string, number>() };
    prev.minutes += entry.durationMinutes;
    prev.categories.set(entry.category, (prev.categories.get(entry.category) ?? 0) + entry.durationMinutes);
    agg.set(entry.userId, prev);
  }

  const totalMinutes = [...agg.values()].reduce((acc, row) => acc + row.minutes, 0);
  const totalHours = totalMinutes / 60;

  const rows: HoursByUserRow[] = [...agg.entries()].map(([userId, data]) => {
    const user = userById.get(userId);
    const hours = data.minutes / 60;
    const profile = user ? profileById.get(user.profileId) : undefined;
    const { sharePercent, sharePercentDisplay } = formatShare(hours, totalHours);
    return {
      id: userId,
      userId,
      userName: user?.name ?? userId,
      profileName: profile?.name ?? "—",
      hours,
      hoursDisplay: formatHours(hours),
      sharePercent,
      sharePercentDisplay,
      topCategories: topCategoryLabels(data.categories, params.categoryLabelByCode),
    };
  });

  return rows.sort((a, b) => b.hours - a.hours);
}

export function buildHoursByProject(params: BuildHoursAggregationsParams): HoursByProjectRow[] {
  const filtered = filterForReport(params);
  const requirementById = new Map(params.requirements.map((r) => [r.id, r]));
  const projectById = new Map(params.projects.map((p) => [p.id, p]));
  const clientById = new Map(params.clients.map((c) => [c.id, c]));

  type Agg = { minutes: number; requirements: Set<string>; people: Set<string> };
  const agg = new Map<string, Agg>();

  for (const entry of filtered) {
    const projectId = resolveEntryProjectId(entry, requirementById) ?? "__sin_proyecto__";
    const prev = agg.get(projectId) ?? { minutes: 0, requirements: new Set<string>(), people: new Set<string>() };
    prev.minutes += entry.durationMinutes;
    if (entry.requirementId) prev.requirements.add(entry.requirementId);
    prev.people.add(entry.userId);
    agg.set(projectId, prev);
  }

  const totalMinutes = [...agg.values()].reduce((acc, row) => acc + row.minutes, 0);
  const totalHours = totalMinutes / 60;

  const rows: HoursByProjectRow[] = [...agg.entries()].map(([projectId, data]) => {
    const hours = data.minutes / 60;
    const project = projectById.get(projectId);
    const reqClientId = projectId !== "__sin_proyecto__"
      ? params.requirements.find((r) => r.projectId === projectId)?.clientId
      : undefined;
    const clientName = reqClientId ? (clientById.get(reqClientId)?.name ?? "—") : project?.clientName ?? "—";
    const { sharePercent, sharePercentDisplay } = formatShare(hours, totalHours);
    return {
      id: projectId,
      projectId,
      projectCode: project?.code ?? (projectId === "__sin_proyecto__" ? "—" : projectId),
      projectName: project?.name ?? (projectId === "__sin_proyecto__" ? "Sin proyecto" : projectId),
      clientName,
      hours,
      hoursDisplay: formatHours(hours),
      sharePercent,
      sharePercentDisplay,
      requirementCount: data.requirements.size,
      distinctPeople: data.people.size,
    };
  });

  return rows.sort((a, b) => b.hours - a.hours);
}

export function buildHoursByCategory(params: BuildHoursAggregationsParams): HoursByCategoryRow[] {
  const filtered = filterForReport(params);

  const agg = new Map<string, number>();
  for (const entry of filtered) {
    agg.set(entry.category, (agg.get(entry.category) ?? 0) + entry.durationMinutes);
  }

  const totalMinutes = [...agg.values()].reduce((acc, m) => acc + m, 0);
  const totalHours = totalMinutes / 60;

  return [...agg.entries()]
    .map(([categoryCode, minutes]) => {
      const hours = minutes / 60;
      const { sharePercent, sharePercentDisplay } = formatShare(hours, totalHours);
      return {
        id: categoryCode,
        categoryCode,
        categoryLabel: params.categoryLabelByCode.get(categoryCode) ?? categoryCode,
        hours,
        hoursDisplay: formatHours(hours),
        sharePercent,
        sharePercentDisplay,
      };
    })
    .sort((a, b) => b.hours - a.hours);
}

export function buildHoursReportSummary(params: BuildHoursAggregationsParams): HoursReportSummary {
  const byProfile = buildHoursByProfile(params);
  const byUser = buildHoursByUser(params);
  const byProject = buildHoursByProject(params);
  const byCategory = buildHoursByCategory(params);

  const totalHours = byProfile.reduce((acc, row) => acc + row.hours, 0);
  const billableHours = byProfile.reduce((acc, row) => acc + row.billableHours, 0);
  const nonBillableHours = Math.max(0, totalHours - billableHours);

  return {
    totalHours,
    totalHoursDisplay: formatHours(totalHours),
    activePeople: byUser.length,
    activeProjects: byProject.filter((p) => p.projectId !== "__sin_proyecto__").length,
    billableHours,
    nonBillableHours,
    billableHoursDisplay: formatHours(billableHours),
    nonBillableHoursDisplay: formatHours(nonBillableHours),
    topProfiles: byProfile.slice(0, 5),
    topUsers: byUser.slice(0, 5),
    topProjects: byProject.slice(0, 5),
    byCategory,
    chartByProfile: byProfile.slice(0, 8).map((row) => ({ name: row.profileName, value: row.hours })),
    chartByProject: byProject.slice(0, 5).map((row) => ({ name: row.projectName, value: row.hours })),
  };
}
