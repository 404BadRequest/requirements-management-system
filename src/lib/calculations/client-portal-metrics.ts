import type {
  ContractBudget,
  ContractProfileAllocation,
  Profile,
  Requirement,
  SettingsCatalogEntry,
  TimeEntry,
  User,
} from "@/types/domain";

export type ClientPortalProfileMetric = {
  profileId: string;
  profileName: string;
  usedMinutes: number;
  quotedMinutes: number;
  usedHours: number;
  quotedHours: number;
  usagePercent: number;
  sharePercent: number;
};

export type ClientPortalChartPoint = {
  name: string;
  value: number;
};

export type ClientPortalMetrics = {
  totalQuotedUf: number;
  consumedUf: number;
  budgetPercentage: number;
  totalUsedMinutes: number;
  totalQuotedMinutes: number;
  hoursUsagePercent: number;
  activeRequirements: number;
  totalRequirements: number;
  profiles: ClientPortalProfileMetric[];
  hoursByProfileChart: ClientPortalChartPoint[];
  hoursShareChart: ClientPortalChartPoint[];
  requirementsByStatusChart: ClientPortalChartPoint[];
  hoursByCategoryChart: ClientPortalChartPoint[];
};

function entryBelongsToClient(
  entry: TimeEntry,
  clientId: string,
  clientContractIds: Set<string>,
  requirementClientById: Map<string, string>,
): boolean {
  if (entry.contractId && clientContractIds.has(entry.contractId)) return true;
  if (entry.clientId === clientId) return true;
  if (entry.requirementId && requirementClientById.get(entry.requirementId) === clientId) return true;
  return false;
}

function resolveEntryProfileId(
  entry: TimeEntry,
  userById: Map<string, User>,
): string {
  if (entry.contractProfileId) return entry.contractProfileId;
  const user = userById.get(entry.userId);
  return user?.profileId ?? "sin-perfil";
}

export function buildClientPortalMetrics(input: {
  clientId: string;
  requirements: Requirement[];
  contracts: ContractBudget[];
  allocations: ContractProfileAllocation[];
  timeEntries: TimeEntry[];
  profiles: Profile[];
  users: User[];
  statuses: SettingsCatalogEntry[];
  categories: SettingsCatalogEntry[];
  terminalStatuses?: Set<string>;
}): ClientPortalMetrics {
  const terminalStatuses =
    input.terminalStatuses ?? new Set(["DONE_PROD", "WONT_DO", "CLOSED"]);

  const clientContracts = input.contracts.filter((contract) => contract.clientId === input.clientId);
  const clientContractIds = new Set(clientContracts.map((contract) => contract.id));
  const clientRequirements = input.requirements.filter((requirement) => requirement.clientId === input.clientId);
  const requirementClientById = new Map(input.requirements.map((requirement) => [requirement.id, requirement.clientId]));
  const profileNameById = new Map(input.profiles.map((profile) => [profile.id, profile.name]));
  const userById = new Map(input.users.map((user) => [user.id, user]));
  const statusLabelByCode = new Map(
    input.statuses.filter((row) => row.active).map((row) => [row.code, row.label]),
  );
  const categoryLabelByCode = new Map(
    input.categories.filter((row) => row.active).map((row) => [row.code, row.label]),
  );

  const clientEntries = input.timeEntries.filter((entry) =>
    entryBelongsToClient(entry, input.clientId, clientContractIds, requirementClientById),
  );

  const totalQuotedUf = input.allocations
    .filter((allocation) => clientContractIds.has(allocation.contractId))
    .reduce((sum, allocation) => {
      const contract = clientContracts.find((item) => item.id === allocation.contractId);
      const rate = allocation.rateUfPerHour ?? contract?.rateUfPerHour ?? 0;
      return sum + (allocation.quotedMinutes / 60) * rate;
    }, 0);

  const consumedUf = clientEntries.reduce((sum, entry) => {
    if (!entry.contractId || !clientContractIds.has(entry.contractId)) return sum;
    const contract = clientContracts.find((item) => item.id === entry.contractId);
    const rate = contract?.rateUfPerHour ?? 0;
    return sum + (entry.durationMinutes / 60) * rate;
  }, 0);

  const usedMinutesByProfile = new Map<string, number>();
  const categoryMinutes = new Map<string, number>();

  for (const entry of clientEntries) {
    const profileId = resolveEntryProfileId(entry, userById);
    usedMinutesByProfile.set(profileId, (usedMinutesByProfile.get(profileId) ?? 0) + entry.durationMinutes);
    const categoryLabel = categoryLabelByCode.get(entry.category) ?? entry.category;
    categoryMinutes.set(categoryLabel, (categoryMinutes.get(categoryLabel) ?? 0) + entry.durationMinutes);
  }

  const quotedMinutesByProfile = new Map<string, number>();
  for (const allocation of input.allocations.filter((item) => clientContractIds.has(item.contractId))) {
    quotedMinutesByProfile.set(
      allocation.profileId,
      (quotedMinutesByProfile.get(allocation.profileId) ?? 0) + allocation.quotedMinutes,
    );
  }

  const profileIds = new Set([...usedMinutesByProfile.keys(), ...quotedMinutesByProfile.keys()]);
  const totalUsedMinutes = clientEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const totalQuotedMinutes = [...quotedMinutesByProfile.values()].reduce((sum, minutes) => sum + minutes, 0);

  const profiles: ClientPortalProfileMetric[] = [...profileIds]
    .map((profileId) => {
      const usedMinutes = usedMinutesByProfile.get(profileId) ?? 0;
      const quotedMinutes = quotedMinutesByProfile.get(profileId) ?? 0;
      const profileName =
        profileId === "sin-perfil"
          ? "Sin perfil"
          : profileNameById.get(profileId) ?? profileId;
      return {
        profileId,
        profileName,
        usedMinutes,
        quotedMinutes,
        usedHours: Math.round((usedMinutes / 60) * 100) / 100,
        quotedHours: Math.round((quotedMinutes / 60) * 100) / 100,
        usagePercent: quotedMinutes > 0 ? Math.round((usedMinutes / quotedMinutes) * 100) : usedMinutes > 0 ? 100 : 0,
        sharePercent: totalUsedMinutes > 0 ? Math.round((usedMinutes / totalUsedMinutes) * 100) : 0,
      };
    })
    .filter((item) => item.usedMinutes > 0 || item.quotedMinutes > 0)
    .sort((a, b) => b.usedMinutes - a.usedMinutes || b.quotedMinutes - a.quotedMinutes);

  const statusCounts = new Map<string, number>();
  for (const requirement of clientRequirements) {
    const label = statusLabelByCode.get(requirement.status) ?? requirement.status;
    statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
  }

  return {
    totalQuotedUf: Math.round(totalQuotedUf * 10) / 10,
    consumedUf: Math.round(consumedUf * 10) / 10,
    budgetPercentage: totalQuotedUf > 0 ? (consumedUf / totalQuotedUf) * 100 : 0,
    totalUsedMinutes,
    totalQuotedMinutes,
    hoursUsagePercent: totalQuotedMinutes > 0 ? (totalUsedMinutes / totalQuotedMinutes) * 100 : 0,
    activeRequirements: clientRequirements.filter((requirement) => !terminalStatuses.has(requirement.status)).length,
    totalRequirements: clientRequirements.length,
    profiles,
    hoursByProfileChart: profiles.map((profile) => ({
      name: profile.profileName,
      value: Math.round(profile.usedHours * 100) / 100,
    })),
    hoursShareChart: profiles
      .filter((profile) => profile.usedMinutes > 0)
      .map((profile) => ({
        name: profile.profileName,
        value: profile.sharePercent,
      })),
    requirementsByStatusChart: [...statusCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    hoursByCategoryChart: [...categoryMinutes.entries()]
      .map(([name, minutes]) => ({ name, value: Math.round((minutes / 60) * 100) / 100 }))
      .sort((a, b) => b.value - a.value),
  };
}
