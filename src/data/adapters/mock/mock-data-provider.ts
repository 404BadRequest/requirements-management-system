import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";
import type { RequirementInput } from "@/schemas/requirement-schema";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";
import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import type { CreateAppNotificationInput } from "@/data/contracts/notifications-contract";
import type { ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import type { CatalogCreateInput, CatalogUpdateInput } from "@/data/contracts/settings-catalog-contract";
import type { CubicacionItemCreateInput, CubicacionItemUpdateInput } from "@/data/contracts/cubicacion-contract";
import type { RequirementTaskCreateInput, RequirementTaskUpdateInput } from "@/data/contracts/requirement-tasks-contract";
import { MockRequirementTasksRepository } from "@/data/adapters/mock/mock-requirement-tasks-repository";
import { pushAuditMemory } from "@/lib/audit/memory";
import { MockBudgetsRepository } from "@/data/adapters/mock/mock-budgets-repository";
import { MockClientsRepository } from "@/data/adapters/mock/mock-clients-repository";
import { MockCubicacionRepository } from "@/data/adapters/mock/mock-cubicacion-repository";
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
  ChatMessage,
  ChatPresencePreference,
  ChatPresenceStatus,
  ChatThread,
  ChatThreadMember,
  Client,
  ContractBudget,
  ContractProfileAllocation,
  CubicacionItem,
  FinancialReferenceRates,
  Profile,
  Requirement,
  RequirementComment,
  RequirementStatusHistory,
  RequirementTask,
  SettingsCatalogEntry,
  SettingsCatalogKind,
  TimeEntry,
  User,
} from "@/types/domain";

export class MockDataProvider implements AppDataProvider {
  private readonly requirementsRepository = new MockRequirementsRepository();
  private readonly requirementTasksRepository = new MockRequirementTasksRepository();
  private readonly timeEntriesRepository = new MockTimeEntriesRepository();
  private readonly usersRepository = new MockUsersRepository();
  private readonly budgetsRepository = new MockBudgetsRepository();
  private readonly profilesRepository = new MockProfilesRepository();
  private readonly clientsRepository = new MockClientsRepository();
  private readonly settingsCatalogRepository = new MockSettingsCatalogRepository();
  private readonly financialReferenceRatesRepository = new MockFinancialReferenceRatesRepository();
  private readonly notificationsRepository = new MockNotificationsRepository();
  private readonly cubicacionRepository = new MockCubicacionRepository();
  private readonly chatThreads: ChatThread[] = [];
  private readonly chatMembers: ChatThreadMember[] = [];
  private readonly chatMessages: ChatMessage[] = [];
  private readonly hiddenChatMessagesByUser = new Set<string>();
  private readonly hiddenChatThreadsByUser = new Set<string>();
  private readonly chatPresence = new Map<string, ChatPresencePreference>();

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

  async getRequirementTasksByRequirementId(requirementId: string): Promise<RequirementTask[]> {
    return this.requirementTasksRepository.getByRequirementId(requirementId);
  }

  async createRequirementTask(input: RequirementTaskCreateInput): Promise<RequirementTask> {
    return this.requirementTasksRepository.create(input);
  }

  async updateRequirementTask(id: string, input: RequirementTaskUpdateInput): Promise<RequirementTask | undefined> {
    return this.requirementTasksRepository.update(id, input);
  }

  async deleteRequirementTask(id: string): Promise<boolean> {
    return this.requirementTasksRepository.delete(id);
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

  async getCubicacionItems(contractId: string): Promise<CubicacionItem[]> {
    return this.cubicacionRepository.listByContract(contractId);
  }
  async createCubicacionItem(input: CubicacionItemCreateInput): Promise<CubicacionItem> {
    return this.cubicacionRepository.create(input);
  }
  async updateCubicacionItem(id: string, input: CubicacionItemUpdateInput): Promise<CubicacionItem | undefined> {
    return this.cubicacionRepository.update(id, input);
  }
  async deleteCubicacionItem(id: string): Promise<boolean> {
    return this.cubicacionRepository.delete(id);
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

  async getChatThreadsForUser(userId: string): Promise<ChatThread[]> {
    const threadIds = new Set(this.chatMembers.filter((row) => row.userId === userId).map((row) => row.threadId));
    return this.chatThreads
      .filter((thread) => threadIds.has(thread.id))
      .filter((thread) => !this.hiddenChatThreadsByUser.has(`${userId}::${thread.id}`))
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  }

  async getChatThreadMembers(threadId: string): Promise<ChatThreadMember[]> {
    return this.chatMembers.filter((row) => row.threadId === threadId);
  }

  async getChatMessages(threadId: string, limit = 100, viewerUserId?: string): Promise<ChatMessage[]> {
    return this.chatMessages
      .filter((row) => row.threadId === threadId)
      .filter((row) => !viewerUserId || !this.hiddenChatMessagesByUser.has(`${viewerUserId}::${row.id}`))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-Math.max(1, limit));
  }

  async createDirectChatThread(input: { createdByUserId: string; peerUserId: string }): Promise<ChatThread> {
    const directKey = [input.createdByUserId, input.peerUserId].sort().join(":");
    const existing = this.chatThreads.find((thread) => thread.type === "direct" && thread.directKey === directKey);
    if (existing) {
      this.hiddenChatThreadsByUser.delete(`${input.createdByUserId}::${existing.id}`);
      return existing;
    }
    const now = new Date().toISOString();
    const created: ChatThread = {
      id: `thread-${crypto.randomUUID().slice(0, 10)}`,
      type: "direct",
      name: null,
      directKey,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
    };
    this.chatThreads.unshift(created);
    this.chatMembers.push(
      {
        threadId: created.id,
        userId: input.createdByUserId,
        role: "owner",
        mutedUntil: null,
        joinedAt: now,
        lastReadMessageId: null,
      },
      {
        threadId: created.id,
        userId: input.peerUserId,
        role: "member",
        mutedUntil: null,
        joinedAt: now,
        lastReadMessageId: null,
      },
    );
    return created;
  }

  async createChatChannel(input: { createdByUserId: string; name: string; memberUserIds: string[] }): Promise<ChatThread> {
    const now = new Date().toISOString();
    const created: ChatThread = {
      id: `thread-${crypto.randomUUID().slice(0, 10)}`,
      type: "channel",
      name: input.name,
      directKey: null,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
    };
    this.chatThreads.unshift(created);
    const uniqueUsers = [...new Set([input.createdByUserId, ...input.memberUserIds])];
    for (const memberId of uniqueUsers) {
      this.chatMembers.push({
        threadId: created.id,
        userId: memberId,
        role: memberId === input.createdByUserId ? "owner" : "member",
        mutedUntil: null,
        joinedAt: now,
        lastReadMessageId: null,
      });
    }
    return created;
  }

  async sendChatMessage(input: { threadId: string; senderUserId: string; body: string }): Promise<ChatMessage> {
    const now = new Date().toISOString();
    const created: ChatMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 12)}`,
      threadId: input.threadId,
      senderUserId: input.senderUserId,
      body: input.body,
      kind: "text",
      createdAt: now,
      editedAt: null,
      deletedAt: null,
    };
    this.chatMessages.push(created);
    const thread = this.chatThreads.find((row) => row.id === input.threadId);
    if (thread) {
      thread.lastMessageAt = now;
      thread.updatedAt = now;
    }
    return created;
  }

  async hideChatMessageForUser(input: { messageId: string; userId: string }): Promise<boolean> {
    const key = `${input.userId}::${input.messageId}`;
    const existed = this.hiddenChatMessagesByUser.has(key);
    this.hiddenChatMessagesByUser.add(key);
    return !existed;
  }

  async unhideChatMessageForUser(input: { messageId: string; userId: string }): Promise<boolean> {
    const key = `${input.userId}::${input.messageId}`;
    const existed = this.hiddenChatMessagesByUser.has(key);
    this.hiddenChatMessagesByUser.delete(key);
    return existed;
  }

  async hideChatThreadForUser(input: { threadId: string; userId: string }): Promise<boolean> {
    const key = `${input.userId}::${input.threadId}`;
    const existed = this.hiddenChatThreadsByUser.has(key);
    this.hiddenChatThreadsByUser.add(key);
    return !existed;
  }

  async unhideChatThreadForUser(input: { threadId: string; userId: string }): Promise<boolean> {
    const key = `${input.userId}::${input.threadId}`;
    const existed = this.hiddenChatThreadsByUser.has(key);
    this.hiddenChatThreadsByUser.delete(key);
    return existed;
  }

  async markChatThreadRead(input: { threadId: string; userId: string; lastReadMessageId: string | null }): Promise<void> {
    const member = this.chatMembers.find((row) => row.threadId === input.threadId && row.userId === input.userId);
    if (!member) return;
    member.lastReadMessageId = input.lastReadMessageId;
  }

  async getChatPresencePreferences(userIds: string[]): Promise<ChatPresencePreference[]> {
    const now = new Date().toISOString();
    return userIds.map((userId) => {
      const existing = this.chatPresence.get(userId);
      if (existing) return existing;
      const fallback: ChatPresencePreference = {
        userId,
        status: "offline",
        dndUntil: null,
        customStatus: null,
        lastSeenAt: now,
        updatedAt: now,
      };
      this.chatPresence.set(userId, fallback);
      return fallback;
    });
  }

  async upsertChatPresencePreference(input: {
    userId: string;
    status: ChatPresenceStatus;
    dndUntil: string | null;
    customStatus: string | null;
  }): Promise<ChatPresencePreference> {
    const now = new Date().toISOString();
    const next: ChatPresencePreference = {
      userId: input.userId,
      status: input.status,
      dndUntil: input.dndUntil,
      customStatus: input.customStatus,
      lastSeenAt: now,
      updatedAt: now,
    };
    this.chatPresence.set(input.userId, next);
    return next;
  }

  async touchChatPresenceHeartbeat(userId: string): Promise<ChatPresencePreference> {
    const now = new Date().toISOString();
    const current = this.chatPresence.get(userId);
    const next: ChatPresencePreference = {
      userId,
      status: current?.status ?? "online",
      dndUntil: current?.dndUntil ?? null,
      customStatus: current?.customStatus ?? null,
      lastSeenAt: now,
      updatedAt: now,
    };
    this.chatPresence.set(userId, next);
    return next;
  }

  async appendAudit(entry: AuditEntryInput): Promise<void> {
    pushAuditMemory(entry);
  }
}
