import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TeamMemberProfile } from "@/components/team/team-member-profile";
import {
  getCatalogByKind,
  getClients,
  getFinancialReferenceRates,
  getProfiles,
  getRequirements,
  getTimeEntries,
  getUsers,
} from "@/data/repositories/server-db";
import { roleHasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/rsc-guard";
import {
  defaultTeamDateRange,
  filterEntriesByDateRange,
  normalizeDateRange,
  periodCapacityHours,
} from "@/lib/calculations/team-utilization";
import { formatHourlyRateDisplay } from "@/lib/formatting/rates";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import type { SettingsCatalogEntry } from "@/types/domain";

function catalogLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((item) => item.active && item.code === code);
  return entry?.label ?? code;
}

function catalogColor(catalog: SettingsCatalogEntry[], code: string): string | null {
  return catalog.find((item) => item.active && item.code === code)?.color ?? null;
}

function requirementStatusLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((item) => item.active && item.code === code);
  return formatStatusLabel(code, entry?.label ?? code);
}

function minutesToHoursDisplay(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} h`;
}

export default async function TeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sessionUser = await requirePermission("team.read");
  const { userId } = await params;
  const sp = await searchParams;
  const defaults = defaultTeamDateRange();
  let from = sp.from?.trim() || defaults.from;
  let to = sp.to?.trim() || defaults.to;
  ({ from, to } = normalizeDateRange(from, to));

  const [users, entries, requirements, profiles, clients, statuses, priorities, referenceRates] = await Promise.all([
    getUsers(),
    getTimeEntries(),
    getRequirements(),
    getProfiles(),
    getClients(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
    getFinancialReferenceRates(),
  ]);

  const member = users.find((user) => user.id === userId);
  if (!member) notFound();

  const profile = profiles.find((item) => item.id === member.profileId);
  const clientById = new Map(clients.map((client) => [client.id, client.name]));
  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const periodEntries = filterEntriesByDateRange(
    entries.filter((entry) => entry.userId === member.id),
    from,
    to,
  );
  const periodMinutes = periodEntries.reduce((acc, entry) => acc + entry.durationMinutes, 0);
  const capacityHours = periodCapacityHours(from, to, referenceRates.weeklyCapacityHours);
  const periodHours = periodMinutes / 60;
  const utilizationPercent = capacityHours > 0 ? Math.round((periodHours / capacityHours) * 100) : periodHours > 0 ? 100 : 0;

  const openRequirements = requirements
    .filter((requirement) => requirement.ownerId === member.id && requirement.status !== "DONE_PROD")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((requirement) => ({
      id: requirement.id,
      title: requirement.title,
      clientName: clientById.get(requirement.clientId) ?? requirement.clientId,
      status: requirement.status,
      statusLabel: requirementStatusLabel(statuses, requirement.status),
      statusColor: catalogColor(statuses, requirement.status),
      priority: requirement.priority,
      priorityLabel: catalogLabel(priorities, requirement.priority),
      priorityColor: catalogColor(priorities, requirement.priority),
    }));

  const recentEntries = [...periodEntries]
    .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`))
    .slice(0, 10)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      timeRange: `${entry.startTime}–${entry.endTime ?? "Pendiente"}`,
      hoursDisplay: minutesToHoursDisplay(entry.durationMinutes),
      requirementTitle: entry.requirementId ? requirementById.get(entry.requirementId)?.title ?? entry.requirementId : null,
    }));

  const allMemberEntries = entries.filter((entry) => entry.userId === member.id);
  const lastEntry = [...allMemberEntries].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`))[0];
  const lastEntryLabel = lastEntry ? lastEntry.date : "—";

  const canRegisterHours = roleHasPermission(sessionUser.role, "time_entries.write") &&
    (sessionUser.role === "Admin" || sessionUser.role === "Project Manager");

  return (
    <AppShell>
      <TeamMemberProfile
        memberId={member.id}
        memberName={member.name}
        memberEmail={member.email}
        memberRole={member.role}
        activeLabel={member.active ? "Activo" : "Inactivo"}
        profileLabel={profile?.name ?? member.profileId}
        rateLabel={profile ? formatHourlyRateDisplay(profile.hourlyRate, profile.rateCurrency) : "—"}
        from={from}
        to={to}
        periodHours={periodHours}
        periodHoursDisplay={minutesToHoursDisplay(periodMinutes)}
        utilizationPercent={utilizationPercent}
        openReqsCount={openRequirements.length}
        lastEntryLabel={lastEntryLabel}
        capacityHours={capacityHours}
        weeklyCapacityHours={referenceRates.weeklyCapacityHours}
        profileNameForUtilization={profile?.name ?? member.role}
        openRequirements={openRequirements}
        recentEntries={recentEntries}
        canRegisterHours={canRegisterHours}
      />
    </AppShell>
  );
}
