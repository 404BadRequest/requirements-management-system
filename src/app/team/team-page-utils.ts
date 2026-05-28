import type { Profile, Requirement, Role, TimeEntry, User } from "@/types/domain";
import { calculateBillingAmount } from "@/lib/calculations/billing";
import {
  filterEntriesByDateRange,
  periodCapacityHours,
  sumMinutesByUser,
} from "@/lib/calculations/team-utilization";
import { formatBillingLineTotal, formatHourlyRateDisplay } from "@/lib/formatting/rates";
import type { TeamDirectoryRow } from "@/app/team/team-directory-table";

export type TeamDirectoryFilters = {
  from: string;
  to: string;
  role?: string;
  profileId?: string;
  activeOnly?: boolean;
};

export function buildTeamDirectoryRows(
  users: User[],
  entries: TimeEntry[],
  requirements: Requirement[],
  profiles: Profile[],
  filters: TeamDirectoryFilters,
  weeklyCapacityHours: number,
): TeamDirectoryRow[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const periodEntries = filterEntriesByDateRange(entries, filters.from, filters.to);
  const minutesByUser = sumMinutesByUser(periodEntries);
  const capacityHours = periodCapacityHours(filters.from, filters.to, weeklyCapacityHours);
  const activeOnly = filters.activeOnly ?? true;
  const roleFilter = filters.role?.trim() ?? "";
  const profileFilter = filters.profileId?.trim() ?? "";

  const openReqsByOwner = new Map<string, number>();
  for (const requirement of requirements) {
    if (requirement.status === "DONE_PROD") continue;
    openReqsByOwner.set(requirement.ownerId, (openReqsByOwner.get(requirement.ownerId) ?? 0) + 1);
  }

  return users
    .filter((user) => {
      if (activeOnly && !user.active) return false;
      if (roleFilter && user.role !== roleFilter) return false;
      if (profileFilter && user.profileId !== profileFilter) return false;
      return true;
    })
    .map((user) => {
      const userMinutes = minutesByUser.get(user.id) ?? 0;
      const openReqsCount = openReqsByOwner.get(user.id) ?? 0;
      const profile = profileMap.get(user.profileId);
      const hours = userMinutes / 60;
      const estimated = profile ? calculateBillingAmount(hours, profile.hourlyRate) : 0;
      const utilizationPercent =
        capacityHours > 0 ? Math.round((hours / capacityHours) * 100) : hours > 0 ? 100 : 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileId: user.profileId,
        profileLabel: profile?.name ?? user.profileId,
        rateLabel: profile ? formatHourlyRateDisplay(profile.hourlyRate, profile.rateCurrency) : "—",
        hours,
        hoursDisplay: `${hours.toFixed(2)} h`,
        estimateLabel: profile ? formatBillingLineTotal(estimated, profile.rateCurrency) : "—",
        openReqsCount,
        utilizationPercent,
        utilizationDisplay: `${utilizationPercent}%`,
        activeLabel: user.active ? "Activo" : "Inactivo",
        capacityHours,
      };
    })
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent || b.hours - a.hours || a.name.localeCompare(b.name));
}

export function isValidRoleFilter(value: string): value is Role {
  return value === "Admin" || value === "Project Manager" || value === "Contributor" || value === "Viewer";
}
