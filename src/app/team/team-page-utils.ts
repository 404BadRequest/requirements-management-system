import type { Profile, Requirement, TimeEntry, User } from "@/types/domain";
import { calculateBillingAmount } from "@/lib/calculations/billing";
import { formatBillingLineTotal, formatHourlyRateDisplay } from "@/lib/formatting/rates";
import type { TeamDirectoryRow } from "@/app/team/team-directory-table";

export function buildTeamDirectoryRows(
  users: User[],
  entries: TimeEntry[],
  requirements: Requirement[],
  profiles: Profile[],
): TeamDirectoryRow[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return users.map((user) => {
    const userMinutes = entries.filter((e) => e.userId === user.id).reduce((acc, e) => acc + e.durationMinutes, 0);
    const reqsAssigned = requirements.filter((r) => r.ownerId === user.id).length;
    const profile = profileMap.get(user.profileId);
    const hours = userMinutes / 60;
    const estimated = profile ? calculateBillingAmount(hours, profile.hourlyRate) : 0;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profileLabel: profile?.name ?? user.profileId,
      rateLabel: profile ? formatHourlyRateDisplay(profile.hourlyRate, profile.rateCurrency) : "—",
      hours,
      hoursDisplay: `${hours.toFixed(2)} h`,
      estimateLabel: profile ? formatBillingLineTotal(estimated, profile.rateCurrency) : "—",
      reqsAssigned,
      activeLabel: user.active ? "Activo" : "Inactivo",
    };
  });
}
