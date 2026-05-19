import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";
import type { RequirementInput } from "@/schemas/requirement-schema";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";
import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import type { CreateAppNotificationInput } from "@/data/contracts/notifications-contract";
import type { ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import type { CatalogCreateInput, CatalogUpdateInput } from "@/data/contracts/settings-catalog-contract";
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

export type AuditEntryInput = {
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: string;
  afterJson: string;
  userId: string;
};

export interface AppDataProvider {
  getClients(): Promise<Client[]>;
  createClient(input: ClientCreateInput): Promise<Client>;
  updateClient(id: string, input: ClientUpdateInput): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  getProfiles(): Promise<Profile[]>;
  createProfile(input: ProfileCreateInput): Promise<Profile>;
  updateProfile(id: string, input: ProfileUpdateInput): Promise<Profile | undefined>;
  deleteProfile(id: string): Promise<boolean>;

  getUsers(): Promise<User[]>;
  createUser(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  updateUser(id: string, input: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  getCatalogByKind(kind: SettingsCatalogKind): Promise<SettingsCatalogEntry[]>;
  createCatalogEntry(input: CatalogCreateInput): Promise<SettingsCatalogEntry>;
  updateCatalogEntry(id: string, input: CatalogUpdateInput): Promise<SettingsCatalogEntry | undefined>;
  deleteCatalogEntry(id: string): Promise<boolean>;

  getRequirements(): Promise<Requirement[]>;
  getRequirementById(id: string): Promise<Requirement | undefined>;
  createRequirement(input: RequirementInput): Promise<Requirement>;
  updateRequirement(id: string, input: Partial<RequirementInput>, meta?: { changedById?: string }): Promise<Requirement | undefined>;
  deleteRequirement(id: string): Promise<boolean>;
  getRequirementComments(requirementId: string): Promise<RequirementComment[]>;
  createRequirementComment(input: { requirementId: string; userId: string; body: string }): Promise<RequirementComment>;
  getRequirementStatusHistory(requirementId: string): Promise<RequirementStatusHistory[]>;

  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntryById(id: string): Promise<TimeEntry | undefined>;
  createTimeEntry(input: TimeEntryInput): Promise<TimeEntry>;
  updateTimeEntry(id: string, input: Partial<TimeEntryInput>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;

  getBudgets(): Promise<BudgetAllocation[]>;
  getContractBudgets(): Promise<ContractBudget[]>;
  createBudget(input: BudgetInput): Promise<ContractBudget>;
  updateBudget(id: string, input: BudgetPatchInput): Promise<ContractBudget | undefined>;
  deleteBudget(id: string): Promise<boolean>;
  getContractProfileAllocations(contractId?: string): Promise<ContractProfileAllocation[]>;

  getFinancialReferenceRates(): Promise<FinancialReferenceRates>;
  updateFinancialReferenceRates(input: FinancialReferenceRatesUpdateInput): Promise<FinancialReferenceRates>;

  listNotificationsForUser(recipientUserId: string): Promise<AppNotification[]>;
  getNotificationsUnreadCount(recipientUserId: string): Promise<number>;
  createAppNotification(input: CreateAppNotificationInput): Promise<AppNotification>;
  markNotificationReadForUser(notificationId: string, recipientUserId: string): Promise<boolean>;

  appendAudit(entry: AuditEntryInput): Promise<void>;
}
