import type { ContractBudget, ContractProfileAllocation, TimeEntry, User } from "@/types/domain";

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
}): {
  byContract: ContractConsumption[];
  byContractProfile: ContractProfileConsumption[];
  totalQuotedMinutes: number;
  totalUsedMinutes: number;
} {
  const userProfileById = new Map(input.users.map((user) => [user.id, user.profileId]));
  const quotedByContract = new Map<string, number>();
  for (const allocation of input.allocations) {
    quotedByContract.set(allocation.contractId, (quotedByContract.get(allocation.contractId) ?? 0) + allocation.quotedMinutes);
  }

  const usedByContract = new Map<string, number>();
  const usedByContractProfile = new Map<string, number>();
  for (const entry of input.entries) {
    if (!entry.contractId) continue;
    usedByContract.set(entry.contractId, (usedByContract.get(entry.contractId) ?? 0) + entry.durationMinutes);
    const profileId = userProfileById.get(entry.userId);
    if (!profileId) continue;
    const key = `${entry.contractId}::${profileId}`;
    usedByContractProfile.set(key, (usedByContractProfile.get(key) ?? 0) + entry.durationMinutes);
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
  };
}
