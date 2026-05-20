import "server-only";

import { MockFinancialReferenceRatesRepository } from "@/data/adapters/mock/mock-financial-reference-rates-repository";
import { MockNotificationsRepository } from "@/data/adapters/mock/mock-notifications-repository";
import { MockBudgetsRepository } from "@/data/adapters/mock/mock-budgets-repository";
import { MockClientsRepository } from "@/data/adapters/mock/mock-clients-repository";
import { MockProfilesRepository } from "@/data/adapters/mock/mock-profiles-repository";
import { MockRequirementsRepository } from "@/data/adapters/mock/mock-requirements-repository";
import { MockSettingsCatalogRepository } from "@/data/adapters/mock/mock-settings-catalog-repository";
import { MockTimeEntriesRepository } from "@/data/adapters/mock/mock-time-entries-repository";
import { MockUsersRepository } from "@/data/adapters/mock/mock-users-repository";
import type { ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import type { CatalogCreateInput, CatalogUpdateInput } from "@/data/contracts/settings-catalog-contract";
import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import type { CreateAppNotificationInput } from "@/data/contracts/notifications-contract";
import { projectsMock } from "@/data/mock/projects";
import { getServerDataProvider } from "@/data/repositories/server-provider";
import { calculateDashboardMetrics } from "@/lib/calculations/dashboard";
import type { DashboardFilters, Profile, Project, RequirementStatusHistory, SettingsCatalogKind, AppNotification } from "@/types/domain";

const requirementsRepository = new MockRequirementsRepository();
const timeEntriesRepository = new MockTimeEntriesRepository();
const usersRepository = new MockUsersRepository();
const budgetsRepository = new MockBudgetsRepository();
const profilesRepository = new MockProfilesRepository();
const clientsRepository = new MockClientsRepository();
const settingsCatalogRepository = new MockSettingsCatalogRepository();
const financialReferenceRatesRepository = new MockFinancialReferenceRatesRepository();
const notificationsRepository = new MockNotificationsRepository();

async function rms() {
  return getServerDataProvider();
}

export const getProjects = async (): Promise<Project[]> => [...projectsMock];

export const getClients = async () => {
  const remote = await rms();
  if (remote) return remote.getClients();
  return clientsRepository.getAll();
};
export const createClient = async (input: ClientCreateInput) => {
  const remote = await rms();
  if (remote) return remote.createClient(input);
  return clientsRepository.create(input);
};
export const updateClient = async (id: string, input: ClientUpdateInput) => {
  const remote = await rms();
  if (remote) return remote.updateClient(id, input);
  return clientsRepository.update(id, input);
};
export const deleteClient = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteClient(id);
  return clientsRepository.delete(id);
};

export const getCatalogByKind = async (kind: SettingsCatalogKind) => {
  const remote = await rms();
  if (remote) return remote.getCatalogByKind(kind);
  return settingsCatalogRepository.getByKind(kind);
};
export const createCatalogEntry = async (input: CatalogCreateInput) => {
  const remote = await rms();
  if (remote) return remote.createCatalogEntry(input);
  return settingsCatalogRepository.create(input);
};
export const updateCatalogEntry = async (id: string, input: CatalogUpdateInput) => {
  const remote = await rms();
  if (remote) return remote.updateCatalogEntry(id, input);
  return settingsCatalogRepository.update(id, input);
};
export const deleteCatalogEntry = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteCatalogEntry(id);
  return settingsCatalogRepository.delete(id);
};

export const getProfiles = async (): Promise<Profile[]> => {
  const remote = await rms();
  if (remote) return remote.getProfiles();
  return profilesRepository.getAll();
};
export const createProfile = async (input: ProfileCreateInput) => {
  const remote = await rms();
  if (remote) return remote.createProfile(input);
  return profilesRepository.create(input);
};
export const updateProfile = async (id: string, input: ProfileUpdateInput) => {
  const remote = await rms();
  if (remote) return remote.updateProfile(id, input);
  return profilesRepository.update(id, input);
};
export const deleteProfile = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteProfile(id);
  return profilesRepository.delete(id);
};

export const getRequirements = async () => {
  const remote = await rms();
  if (remote) return remote.getRequirements();
  return requirementsRepository.getAll();
};
export const getRequirementById = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.getRequirementById(id);
  return requirementsRepository.getById(id);
};
export const createRequirement = async (input: Parameters<typeof requirementsRepository.create>[0]) => {
  const remote = await rms();
  if (remote) return remote.createRequirement(input);
  return requirementsRepository.create(input);
};
export const updateRequirement = async (
  id: string,
  input: Parameters<typeof requirementsRepository.update>[1],
  meta?: { changedById?: string },
) => {
  const remote = await rms();
  if (remote) return remote.updateRequirement(id, input, meta);
  const current = await requirementsRepository.getById(id);
  const updated = await requirementsRepository.update(id, input);
  if (updated && meta?.changedById && current && input.status !== undefined && input.status !== current.status) {
    const entry: RequirementStatusHistory = {
      id: `history-${crypto.randomUUID().slice(0, 10)}`,
      requirementId: id,
      fromStatus: current.status,
      toStatus: input.status,
      changedById: meta.changedById,
      changedAt: updated.updatedAt,
    };
    requirementsRepository.appendStatusHistory(entry);
  }
  return updated;
};
export const deleteRequirement = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteRequirement(id);
  return requirementsRepository.delete(id);
};
export const getRequirementComments = async (requirementId: string) => {
  const remote = await rms();
  if (remote) return remote.getRequirementComments(requirementId);
  return requirementsRepository.getComments(requirementId);
};

export const createRequirementComment = async (input: { requirementId: string; userId: string; body: string }) => {
  const remote = await rms();
  if (remote) return remote.createRequirementComment(input);
  return requirementsRepository.createComment(input);
};
export const getRequirementStatusHistory = async (requirementId: string) => {
  const remote = await rms();
  if (remote) return remote.getRequirementStatusHistory(requirementId);
  return requirementsRepository.getStatusHistory(requirementId);
};

export const getTimeEntries = async () => {
  const remote = await rms();
  if (remote) return remote.getTimeEntries();
  return timeEntriesRepository.getAll();
};
export const getTimeEntryById = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.getTimeEntryById(id);
  return timeEntriesRepository.getById(id);
};
export const createTimeEntry = async (input: Parameters<typeof timeEntriesRepository.create>[0]) => {
  const remote = await rms();
  if (remote) return remote.createTimeEntry(input);
  return timeEntriesRepository.create(input);
};
export const updateTimeEntry = async (id: string, input: Parameters<typeof timeEntriesRepository.update>[1]) => {
  const remote = await rms();
  if (remote) return remote.updateTimeEntry(id, input);
  return timeEntriesRepository.update(id, input);
};
export const deleteTimeEntry = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteTimeEntry(id);
  return timeEntriesRepository.delete(id);
};

export const getUsers = async () => {
  const remote = await rms();
  if (remote) return remote.getUsers();
  return usersRepository.getAll();
};
export const createUser = async (input: Parameters<typeof usersRepository.create>[0]) => {
  const remote = await rms();
  if (remote) return remote.createUser(input);
  return usersRepository.create(input);
};
export const updateUser = async (id: string, input: Parameters<typeof usersRepository.update>[1]) => {
  const remote = await rms();
  if (remote) return remote.updateUser(id, input);
  return usersRepository.update(id, input);
};
export const deleteUser = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteUser(id);
  return usersRepository.delete(id);
};

export const getBudgets = async () => {
  const remote = await rms();
  if (remote) return remote.getBudgets();
  const contracts = await budgetsRepository.getAll();
  return contracts.flatMap((contract) =>
    contract.allocations.map((allocation) => ({
      id: allocation.id,
      projectId: contract.projectId,
      scope: contract.scope,
      profileId: allocation.profileId,
      quotedMinutes: allocation.quotedMinutes,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
    })),
  );
};
export const getContractBudgets = async () => {
  const remote = await rms();
  if (remote) return remote.getContractBudgets();
  const contracts = await budgetsRepository.getAll();
  return contracts.map(({ allocations: _allocations, ...contract }) => contract);
};
export const createBudget = async (input: Parameters<typeof budgetsRepository.create>[0]) => {
  const remote = await rms();
  if (remote) return remote.createBudget(input);
  return budgetsRepository.create(input);
};
export const updateBudget = async (id: string, input: Parameters<typeof budgetsRepository.update>[1]) => {
  const remote = await rms();
  if (remote) return remote.updateBudget(id, input);
  return budgetsRepository.update(id, input);
};
export const deleteBudget = async (id: string) => {
  const remote = await rms();
  if (remote) return remote.deleteBudget(id);
  return budgetsRepository.delete(id);
};
export const getContractProfileAllocations = async (contractId?: string) => {
  const remote = await rms();
  if (remote) return remote.getContractProfileAllocations(contractId);
  const contracts = await budgetsRepository.getAll();
  const rows = contracts.flatMap((contract) => contract.allocations);
  if (!contractId) return rows;
  return rows.filter((row) => row.contractId === contractId);
};

export const getBudgetSummary = async (projectId: string) => {
  const [budgets, entries] = await Promise.all([getBudgets(), getTimeEntries()]);
  const projectBudgets = budgets.filter((item) => item.projectId === projectId);
  const projectEntries = entries.filter((item) => item.projectId === projectId);

  return calculateDashboardMetrics([], projectEntries, projectBudgets);
};

export const getDashboardMetrics = async (filters?: DashboardFilters) => {
  const [requirements, entries, budgets, users, profiles, clients, contracts] = await Promise.all([
    getRequirements(),
    getTimeEntries(),
    getBudgets(),
    getUsers(),
    getProfiles(),
    getClients(),
    getContractBudgets(),
  ]);

  const filteredRequirements = requirements.filter((item) => {
    if (filters?.projectId && item.projectId !== filters.projectId) return false;
    if (filters?.clientId && item.clientId !== filters.clientId) return false;
    if (filters?.ownerId && item.ownerId !== filters.ownerId) return false;
    if (filters?.priority && item.priority !== filters.priority) return false;
    if (filters?.status && item.status !== filters.status) return false;
    return true;
  });

  const filteredEntries = entries.filter((item) => {
    if (filters?.projectId && item.projectId !== filters.projectId) return false;
    if (filters?.clientId) {
      const requirementClientId = item.requirementId
        ? requirements.find((requirementItem) => requirementItem.id === item.requirementId)?.clientId
        : null;
      const contractClientId = item.contractId ? contracts.find((contractItem) => contractItem.id === item.contractId)?.clientId : null;
      const resolvedClientId = requirementClientId ?? contractClientId ?? null;
      if (resolvedClientId !== filters.clientId) return false;
    }
    if (filters?.ownerId && item.userId !== filters.ownerId) return false;
    if (filters?.category && item.category !== filters.category) return false;
    if (filters?.from && item.date < filters.from) return false;
    if (filters?.to && item.date > filters.to) return false;
    return true;
  });

  const filteredBudgets = budgets.filter((item) => !filters?.projectId || item.projectId === filters.projectId);

  return calculateDashboardMetrics(filteredRequirements, filteredEntries, filteredBudgets, {
    users,
    profiles,
    clients,
    contracts,
    referenceRates: await getFinancialReferenceRates(),
  });
};

export const getFinancialReferenceRates = async () => {
  const remote = await rms();
  if (remote) return remote.getFinancialReferenceRates();
  return financialReferenceRatesRepository.get();
};

export const updateFinancialReferenceRates = async (input: FinancialReferenceRatesUpdateInput) => {
  const remote = await rms();
  if (remote) return remote.updateFinancialReferenceRates(input);
  return financialReferenceRatesRepository.update(input);
};

export const listNotificationsForUser = async (recipientUserId: string): Promise<AppNotification[]> => {
  const remote = await rms();
  if (remote) return remote.listNotificationsForUser(recipientUserId);
  return notificationsRepository.listForUser(recipientUserId);
};

export const getNotificationsUnreadCountForUser = async (recipientUserId: string): Promise<number> => {
  const remote = await rms();
  if (remote) return remote.getNotificationsUnreadCount(recipientUserId);
  return notificationsRepository.unreadCountForUser(recipientUserId);
};

export const createAppNotification = async (input: CreateAppNotificationInput): Promise<AppNotification> => {
  const remote = await rms();
  if (remote) return remote.createAppNotification(input);
  return notificationsRepository.create(input);
};

export const markNotificationReadForUser = async (notificationId: string, recipientUserId: string): Promise<boolean> => {
  const remote = await rms();
  if (remote) return remote.markNotificationReadForUser(notificationId, recipientUserId);
  return notificationsRepository.markRead(notificationId, recipientUserId);
};
