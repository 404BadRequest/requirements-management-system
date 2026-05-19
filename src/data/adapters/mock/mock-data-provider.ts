import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";
import type { RequirementInput } from "@/schemas/requirement-schema";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";
import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import type { CreateAppNotificationInput } from "@/data/contracts/notifications-contract";
import type { ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import type { CatalogCreateInput, CatalogUpdateInput } from "@/data/contracts/settings-catalog-contract";
import { pushAuditMemory } from "@/lib/audit/memory";
import { MockBudgetsRepository } from "@/data/adapters/mock/mock-budgets-repository";
import { MockClientsRepository } from "@/data/adapters/mock/mock-clients-repository";
import { MockFinancialReferenceRatesRepository } from "@/data/adapters/mock/mock-financial-reference-rates-repository";
import { MockNotificationsRepository } from "@/data/adapters/mock/mock-notifications-repository";
import { MockProfilesRepository } from "@/data/adapters/mock/mock-profiles-repository";
import { MockRequirementsRepository } from "@/data/adapters/mock/mock-requirements-repository";
import { MockSettingsCatalogRepository } from "@/data/adapters/mock/mock-settings-catalog-repository";
import { MockTimeEntriesRepository } from "@/data/adapters/mock/mock-time-entries-repository";
import { MockUsersRepository } from "@/data/adapters/mock/mock-users-repository";
import type { AppDataProvider, AuditEntryInput } from "@/data/repositories/app-data-provider";
import type {
  AppNotification,
  BudgetAllocation,
  Client,
  ContractBudget,
  ContractProfileAllocation,
  FinancialReferenceRates,
  Profile,
  Requirement,
  RequirementComment,
  RequirementStatusHistory,
  SettingsCatalogEntry,
  SettingsCatalogKind,
  TimeEntry,
  User,
} from "@/types/domain";

export class MockDataProvider implements AppDataProvider {
  private readonly requirementsRepository = new MockRequirementsRepository();
  private readonly timeEntriesRepository = new MockTimeEntriesRepository();
  private readonly usersRepository = new MockUsersRepository();
  private readonly budgetsRepository = new MockBudgetsRepository();
  private readonly profilesRepository = new MockProfilesRepository();
  private readonly clientsRepository = new MockClientsRepository();
  private readonly settingsCatalogRepository = new MockSettingsCatalogRepository();
  private readonly financialReferenceRatesRepository = new MockFinancialReferenceRatesRepository();
  private readonly notificationsRepository = new MockNotificationsRepository();

  async getClients(): Promise<Client[]> {
    return this.clientsRepository.getAll();
  }
  async createClient(input: ClientCreateInput): Promise<Client> {
    return this.clientsRepository.create(input);
  }
  async updateClient(id: string, input: ClientUpdateInput): Promise<Client | undefined> {
    return this.clientsRepository.update(id, input);
  }
  async deleteClient(id: string): Promise<boolean> {
    return this.clientsRepository.delete(id);
  }

  async getProfiles(): Promise<Profile[]> {
    return this.profilesRepository.getAll();
  }
  async createProfile(input: ProfileCreateInput): Promise<Profile> {
    return this.profilesRepository.create(input);
  }
  async updateProfile(id: string, input: ProfileUpdateInput): Promise<Profile | undefined> {
    return this.profilesRepository.update(id, input);
  }
  async deleteProfile(id: string): Promise<boolean> {
    return this.profilesRepository.delete(id);
  }

  async getUsers(): Promise<User[]> {
    return this.usersRepository.getAll();
  }
  async createUser(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    return this.usersRepository.create(input);
  }
  async updateUser(id: string, input: Partial<User>): Promise<User | undefined> {
    return this.usersRepository.update(id, input);
  }
  async deleteUser(id: string): Promise<boolean> {
    return this.usersRepository.delete(id);
  }

  async getCatalogByKind(kind: SettingsCatalogKind): Promise<SettingsCatalogEntry[]> {
    return this.settingsCatalogRepository.getByKind(kind);
  }
  async createCatalogEntry(input: CatalogCreateInput): Promise<SettingsCatalogEntry> {
    return this.settingsCatalogRepository.create(input);
  }
  async updateCatalogEntry(id: string, input: CatalogUpdateInput): Promise<SettingsCatalogEntry | undefined> {
    return this.settingsCatalogRepository.update(id, input);
  }
  async deleteCatalogEntry(id: string): Promise<boolean> {
    return this.settingsCatalogRepository.delete(id);
  }

  async getRequirements(): Promise<Requirement[]> {
    return this.requirementsRepository.getAll();
  }
  async getRequirementById(id: string): Promise<Requirement | undefined> {
    return this.requirementsRepository.getById(id);
  }
  async createRequirement(input: RequirementInput): Promise<Requirement> {
    return this.requirementsRepository.create(input);
  }
  async updateRequirement(
    id: string,
    input: Partial<RequirementInput>,
    meta?: { changedById?: string },
  ): Promise<Requirement | undefined> {
    const current = await this.requirementsRepository.getById(id);
    const updated = await this.requirementsRepository.update(id, input);
    if (updated && current && meta?.changedById && input.status !== undefined && input.status !== current.status) {
      const entry: RequirementStatusHistory = {
        id: `history-${crypto.randomUUID().slice(0, 10)}`,
        requirementId: id,
        fromStatus: current.status,
        toStatus: input.status,
        changedById: meta.changedById,
        changedAt: updated.updatedAt,
      };
      this.requirementsRepository.appendStatusHistory(entry);
    }
    return updated;
  }
  async deleteRequirement(id: string): Promise<boolean> {
    return this.requirementsRepository.delete(id);
  }
  async getRequirementComments(requirementId: string): Promise<RequirementComment[]> {
    return this.requirementsRepository.getComments(requirementId);
  }
  async createRequirementComment(input: { requirementId: string; userId: string; body: string }): Promise<RequirementComment> {
    return this.requirementsRepository.createComment(input);
  }
  async getRequirementStatusHistory(requirementId: string): Promise<RequirementStatusHistory[]> {
    return this.requirementsRepository.getStatusHistory(requirementId);
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return this.timeEntriesRepository.getAll();
  }
  async getTimeEntryById(id: string): Promise<TimeEntry | undefined> {
    return this.timeEntriesRepository.getById(id);
  }
  async createTimeEntry(input: TimeEntryInput): Promise<TimeEntry> {
    return this.timeEntriesRepository.create(input);
  }
  async updateTimeEntry(id: string, input: Partial<TimeEntryInput>): Promise<TimeEntry | undefined> {
    return this.timeEntriesRepository.update(id, input);
  }
  async deleteTimeEntry(id: string): Promise<boolean> {
    return this.timeEntriesRepository.delete(id);
  }

  async getBudgets(): Promise<BudgetAllocation[]> {
    const contracts = await this.budgetsRepository.getAll();
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
  }
  async getContractBudgets(): Promise<ContractBudget[]> {
    const contracts = await this.budgetsRepository.getAll();
    return contracts.map(({ allocations: _allocations, ...contract }) => contract);
  }
  async createBudget(input: BudgetInput): Promise<ContractBudget> {
    const created = await this.budgetsRepository.create(input);
    const { allocations: _allocations, ...contract } = created;
    return contract;
  }
  async updateBudget(id: string, input: BudgetPatchInput): Promise<ContractBudget | undefined> {
    const updated = await this.budgetsRepository.update(id, input);
    if (!updated) return undefined;
    const { allocations: _allocations, ...contract } = updated;
    return contract;
  }
  async deleteBudget(id: string): Promise<boolean> {
    return this.budgetsRepository.delete(id);
  }
  async getContractProfileAllocations(contractId?: string): Promise<ContractProfileAllocation[]> {
    const contracts = await this.budgetsRepository.getAll();
    const rows = contracts.flatMap((contract) => contract.allocations);
    if (!contractId) return rows;
    return rows.filter((row) => row.contractId === contractId);
  }

  async getFinancialReferenceRates(): Promise<FinancialReferenceRates> {
    return this.financialReferenceRatesRepository.get();
  }
  async updateFinancialReferenceRates(input: FinancialReferenceRatesUpdateInput): Promise<FinancialReferenceRates> {
    return this.financialReferenceRatesRepository.update(input);
  }

  async listNotificationsForUser(recipientUserId: string): Promise<AppNotification[]> {
    return this.notificationsRepository.listForUser(recipientUserId);
  }
  async getNotificationsUnreadCount(recipientUserId: string): Promise<number> {
    return this.notificationsRepository.unreadCountForUser(recipientUserId);
  }
  async createAppNotification(input: CreateAppNotificationInput): Promise<AppNotification> {
    return this.notificationsRepository.create(input);
  }
  async markNotificationReadForUser(notificationId: string, recipientUserId: string): Promise<boolean> {
    return this.notificationsRepository.markRead(notificationId, recipientUserId);
  }

  async appendAudit(entry: AuditEntryInput): Promise<void> {
    pushAuditMemory(entry);
  }
}
