import type { SupabaseClient } from "@supabase/supabase-js";
import { RmsDataAccess } from "@/data/adapters/supabase/rms-data-access";
import type { AppDataProvider, AuditEntryInput } from "@/data/repositories/app-data-provider";

export class SupabaseDataProvider implements AppDataProvider {
  private readonly access: RmsDataAccess;

  constructor(client: SupabaseClient) {
    this.access = new RmsDataAccess(client);
  }

  getClients = () => this.access.getClients();
  createClient = (input: Parameters<RmsDataAccess["createClient"]>[0]) => this.access.createClient(input);
  updateClient = (id: string, input: Parameters<RmsDataAccess["updateClient"]>[1]) => this.access.updateClient(id, input);
  deleteClient = (id: string) => this.access.deleteClient(id);

  getProfiles = () => this.access.getProfiles();
  createProfile = (input: Parameters<RmsDataAccess["createProfile"]>[0]) => this.access.createProfile(input);
  updateProfile = (id: string, input: Parameters<RmsDataAccess["updateProfile"]>[1]) => this.access.updateProfile(id, input);
  deleteProfile = (id: string) => this.access.deleteProfile(id);

  getUsers = () => this.access.getUsers();
  createUser = (input: Parameters<RmsDataAccess["createUser"]>[0]) => this.access.createUser(input);
  updateUser = (id: string, input: Parameters<RmsDataAccess["updateUser"]>[1]) => this.access.updateUser(id, input);
  deleteUser = (id: string) => this.access.deleteUser(id);

  getCatalogByKind = (kind: Parameters<RmsDataAccess["getCatalogByKind"]>[0]) => this.access.getCatalogByKind(kind);
  createCatalogEntry = (input: Parameters<RmsDataAccess["createCatalogEntry"]>[0]) => this.access.createCatalogEntry(input);
  updateCatalogEntry = (id: string, input: Parameters<RmsDataAccess["updateCatalogEntry"]>[1]) =>
    this.access.updateCatalogEntry(id, input);
  deleteCatalogEntry = (id: string) => this.access.deleteCatalogEntry(id);

  getRequirements = () => this.access.getRequirements();
  getRequirementById = (id: string) => this.access.getRequirementById(id);
  createRequirement = (input: Parameters<RmsDataAccess["createRequirement"]>[0]) => this.access.createRequirement(input);
  updateRequirement = (id: string, input: Parameters<RmsDataAccess["updateRequirement"]>[1], meta?: { changedById?: string }) =>
    this.access.updateRequirement(id, input, meta);
  deleteRequirement = (id: string) => this.access.deleteRequirement(id);
  getRequirementComments = (requirementId: string) => this.access.getRequirementComments(requirementId);
  createRequirementComment = (input: Parameters<RmsDataAccess["createRequirementComment"]>[0]) =>
    this.access.createRequirementComment(input);
  getRequirementStatusHistory = (requirementId: string) => this.access.getRequirementStatusHistory(requirementId);
  getRequirementTasksByRequirementId = (requirementId: string) => this.access.getRequirementTasksByRequirementId(requirementId);
  createRequirementTask = (input: Parameters<RmsDataAccess["createRequirementTask"]>[0]) => this.access.createRequirementTask(input);
  updateRequirementTask = (id: string, input: Parameters<RmsDataAccess["updateRequirementTask"]>[1]) =>
    this.access.updateRequirementTask(id, input);
  deleteRequirementTask = (id: string) => this.access.deleteRequirementTask(id);

  getTimeEntries = () => this.access.getTimeEntries();
  getTimeEntryById = (id: string) => this.access.getTimeEntryById(id);
  createTimeEntry = (input: Parameters<RmsDataAccess["createTimeEntry"]>[0]) => this.access.createTimeEntry(input);
  updateTimeEntry = (id: string, input: Parameters<RmsDataAccess["updateTimeEntry"]>[1]) => this.access.updateTimeEntry(id, input);
  deleteTimeEntry = (id: string) => this.access.deleteTimeEntry(id);

  getBudgets = () => this.access.getBudgets();
  getContractBudgets = () => this.access.getContractBudgets();
  createBudget = (input: Parameters<RmsDataAccess["createBudget"]>[0]) => this.access.createBudget(input);
  updateBudget = (id: string, input: Parameters<RmsDataAccess["updateBudget"]>[1]) => this.access.updateBudget(id, input);
  deleteBudget = (id: string) => this.access.deleteBudget(id);
  getContractProfileAllocations = (contractId?: string) => this.access.getContractProfileAllocations(contractId);

  getFinancialReferenceRates = () => this.access.getFinancialReferenceRates();
  updateFinancialReferenceRates = (input: Parameters<RmsDataAccess["updateFinancialReferenceRates"]>[0]) =>
    this.access.updateFinancialReferenceRates(input);

  getCubicacionItems = (contractId: string) => this.access.getCubicacionItems(contractId);
  getCubicacionItemByRequirementId = (requirementId: string) => this.access.getCubicacionItemByRequirementId(requirementId);
  createCubicacionItem = (input: Parameters<RmsDataAccess["createCubicacionItem"]>[0]) => this.access.createCubicacionItem(input);
  updateCubicacionItem = (id: string, input: Parameters<RmsDataAccess["updateCubicacionItem"]>[1]) =>
    this.access.updateCubicacionItem(id, input);
  deleteCubicacionItem = (id: string) => this.access.deleteCubicacionItem(id);

  listNotificationsForUser = (recipientUserId: string) => this.access.listNotificationsForUser(recipientUserId);
  getNotificationsUnreadCount = (recipientUserId: string) => this.access.getNotificationsUnreadCount(recipientUserId);
  createAppNotification = (input: Parameters<RmsDataAccess["createAppNotification"]>[0]) => this.access.createAppNotification(input);
  markNotificationReadForUser = (notificationId: string, recipientUserId: string) =>
    this.access.markNotificationReadForUser(notificationId, recipientUserId);

  getChatThreadsForUser = (userId: string) => this.access.getChatThreadsForUser(userId);
  getChatThreadMembers = (threadId: string) => this.access.getChatThreadMembers(threadId);
  getChatMessages = (threadId: string, limit?: number, viewerUserId?: string) =>
    this.access.getChatMessages(threadId, limit, viewerUserId);
  createDirectChatThread = (input: Parameters<RmsDataAccess["createDirectChatThread"]>[0]) => this.access.createDirectChatThread(input);
  createChatChannel = (input: Parameters<RmsDataAccess["createChatChannel"]>[0]) => this.access.createChatChannel(input);
  sendChatMessage = (input: Parameters<RmsDataAccess["sendChatMessage"]>[0]) => this.access.sendChatMessage(input);
  hideChatMessageForUser = (input: Parameters<RmsDataAccess["hideChatMessageForUser"]>[0]) => this.access.hideChatMessageForUser(input);
  unhideChatMessageForUser = (input: Parameters<RmsDataAccess["unhideChatMessageForUser"]>[0]) => this.access.unhideChatMessageForUser(input);
  hideChatThreadForUser = (input: Parameters<RmsDataAccess["hideChatThreadForUser"]>[0]) => this.access.hideChatThreadForUser(input);
  unhideChatThreadForUser = (input: Parameters<RmsDataAccess["unhideChatThreadForUser"]>[0]) => this.access.unhideChatThreadForUser(input);
  markChatThreadRead = (input: Parameters<RmsDataAccess["markChatThreadRead"]>[0]) => this.access.markChatThreadRead(input);
  getChatPresencePreferences = (userIds: string[]) => this.access.getChatPresencePreferences(userIds);
  upsertChatPresencePreference = (input: Parameters<RmsDataAccess["upsertChatPresencePreference"]>[0]) =>
    this.access.upsertChatPresencePreference(input);
  touchChatPresenceHeartbeat = (userId: string) => this.access.touchChatPresenceHeartbeat(userId);

  appendAudit = (entry: AuditEntryInput) => this.access.appendAudit(entry);
}
