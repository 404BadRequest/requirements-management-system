import type { ContractBudget, ContractProfileAllocation, FinancialReferenceRates, Profile, TimeEntry, User } from "@/types/domain";

export type ContractConsumption = {
  contractId: string;
  usedMinutes: number;
  quotedMinutes: number;
  availableMinutes: number;
  consumptionPct: number;
};

export type ContractProfileConsumption = {
  contractId: string;
  profileId: string;
  usedMinutes: number;
  quotedMinutes: number;
  availableMinutes: number;
  consumptionPct: number;
};

export function calculateContractConsumptions(input: {
  contracts: ContractBudget[];
  allocations: ContractProfileAllocation[];
  entries: TimeEntry[];
  users: User[];
  profiles: Profile[];
  referenceRates: FinancialReferenceRates;
}): {
  byContract: ContractConsumption[];
  byContractProfile: ContractProfileConsumption[];
  totalQuotedMinutes: number;
  totalUsedMinutes: number;
  unallocatedCount: number;
  unallocatedMinutes: number;
} {
  const userProfileById = new Map(input.users.map((user) => [user.id, user.profileId]));
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  const contractById = new Map(input.contracts.map((contract) => [contract.id, contract]));
  const quotedByContract = new Map<string, number>();
  for (const allocation of input.allocations) {
    quotedByContract.set(allocation.contractId, (quotedByContract.get(allocation.contractId) ?? 0) + allocation.quotedMinutes);
  }

  const usedByContract = new Map<string, number>();
  const usedByContractProfile = new Map<string, number>();
  let unallocatedCount = 0;
  let unallocatedMinutes = 0;

  const toUfHourlyRate = (profile: Profile): number | null => {
    const currency = profile.rateCurrency.trim().toUpperCase();
    if (currency === "UF") return profile.hourlyRate;
    if (currency === "CLP") {
      return input.referenceRates.ufToClp > 0 ? profile.hourlyRate / input.referenceRates.ufToClp : null;
    }
    if (currency === "USD") {
      if (input.referenceRates.ufToClp <= 0) return null;
      return (profile.hourlyRate * input.referenceRates.usdToClp) / input.referenceRates.ufToClp;
    }
    return null;
  };

  for (const entry of input.entries) {
    if (!entry.contractId) continue;
    const workerProfileId = userProfileById.get(entry.userId);
    if (!workerProfileId) {
      unallocatedCount += 1;
      unallocatedMinutes += entry.durationMinutes;
      continue;
    }
    const workerProfile = profileById.get(workerProfileId);
    const contract = contractById.get(entry.contractId);
    if (!workerProfile || !contract) {
      unallocatedCount += 1;
      unallocatedMinutes += entry.durationMinutes;
      continue;
    }
    const workerUfRate = toUfHourlyRate(workerProfile);
    if (!workerUfRate || workerUfRate <= 0) {
      unallocatedCount += 1;
      unallocatedMinutes += entry.durationMinutes;
      continue;
    }

    const targetProfileId = entry.contractProfileId ?? workerProfileId;
    const allocation = input.allocations.find((row) => row.contractId === entry.contractId && row.profileId === targetProfileId);
    if (!allocation) {
      unallocatedCount += 1;
      unallocatedMinutes += entry.durationMinutes;
      continue;
    }

    const targetUfRate = allocation.rateUfPerHour ?? contract.rateUfPerHour;
    if (!targetUfRate || targetUfRate <= 0) {
      unallocatedCount += 1;
      unallocatedMinutes += entry.durationMinutes;
      continue;
    }

    const equivalentMinutes = entry.durationMinutes * (workerUfRate / targetUfRate);
    usedByContract.set(entry.contractId, (usedByContract.get(entry.contractId) ?? 0) + equivalentMinutes);
    const key = `${entry.contractId}::${targetProfileId}`;
    usedByContractProfile.set(key, (usedByContractProfile.get(key) ?? 0) + equivalentMinutes);
  }

  const byContract = input.contracts.map((contract) => {
    const quotedMinutes = quotedByContract.get(contract.id) ?? 0;
    const usedMinutes = usedByContract.get(contract.id) ?? 0;
    const availableMinutes = quotedMinutes - usedMinutes;
    const consumptionPct = quotedMinutes > 0 ? (usedMinutes / quotedMinutes) * 100 : 0;
    return {
      contractId: contract.id,
      usedMinutes,
      quotedMinutes,
      availableMinutes,
      consumptionPct,
    };
  });

  const byContractProfile = input.allocations.map((allocation) => {
    const key = `${allocation.contractId}::${allocation.profileId}`;
    const usedMinutes = usedByContractProfile.get(key) ?? 0;
    const quotedMinutes = allocation.quotedMinutes;
    const availableMinutes = quotedMinutes - usedMinutes;
    const consumptionPct = quotedMinutes > 0 ? (usedMinutes / quotedMinutes) * 100 : 0;
    return {
      contractId: allocation.contractId,
      profileId: allocation.profileId,
      usedMinutes,
      quotedMinutes,
      availableMinutes,
      consumptionPct,
    };
  });

  const totalQuotedMinutes = byContract.reduce((acc, row) => acc + row.quotedMinutes, 0);
  const totalUsedMinutes = byContract.reduce((acc, row) => acc + row.usedMinutes, 0);
  return {
    byContract,
    byContractProfile,
    totalQuotedMinutes,
    totalUsedMinutes,
    unallocatedCount,
    unallocatedMinutes,
  };
}
