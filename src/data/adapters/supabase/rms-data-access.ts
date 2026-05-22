import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import type { CatalogCreateInput, CatalogUpdateInput } from "@/data/contracts/settings-catalog-contract";
import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";
import type { RequirementInput } from "@/schemas/requirement-schema";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";
import { calculateDurationMinutes } from "@/lib/calculations/time";
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
import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import type { CreateAppNotificationInput } from "@/data/contracts/notifications-contract";

type Row = Record<string, unknown>;

function mapClient(r: Row): Client {
  return {
    id: String(r.id),
    name: String(r.name),
    code: String(r.code),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapProfile(r: Row): Profile {
  return {
    id: String(r.id),
    name: String(r.name),
    hourlyRate: Number(r.hourly_rate),
    rateCurrency: String(r.rate_currency),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapUser(r: Row): User {
  const aliases = Array.isArray(r.aliases) ? (r.aliases as string[]) : JSON.parse(String(r.aliases ?? "[]")) as string[];
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    aliases,
    profileId: String(r.profile_id),
    active: Boolean(r.active),
    role: r.role as User["role"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapRequirement(r: Row): Requirement {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    clientId: String(r.client_id),
    contractId: r.contract_id ? String(r.contract_id) : null,
    origin: String(r.origin),
    title: String(r.title),
    description: String(r.description),
    priority: String(r.priority),
    ownerId: String(r.owner_id),
    status: String(r.status),
    notes: String(r.notes ?? ""),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
  };
}

function mapAppNotification(r: Row): AppNotification {
  return {
    id: String(r.id),
    recipientUserId: String(r.recipient_user_id),
    title: String(r.title),
    body: String(r.body),
    href: r.href != null && r.href !== "" ? String(r.href) : null,
    readAt: r.read_at ? String(r.read_at) : null,
    createdAt: String(r.created_at),
  };
}

function mapChatThread(r: Row): ChatThread {
  return {
    id: String(r.id),
    type: String(r.type) as ChatThread["type"],
    name: r.name ? String(r.name) : null,
    directKey: r.direct_key ? String(r.direct_key) : null,
    createdByUserId: String(r.created_by_user_id),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    lastMessageAt: r.last_message_at ? String(r.last_message_at) : null,
  };
}

function mapChatThreadMember(r: Row): ChatThreadMember {
  return {
    threadId: String(r.thread_id),
    userId: String(r.user_id),
    role: String(r.role) as ChatThreadMember["role"],
    mutedUntil: r.muted_until ? String(r.muted_until) : null,
    joinedAt: String(r.joined_at),
    lastReadMessageId: r.last_read_message_id ? String(r.last_read_message_id) : null,
  };
}

function mapChatMessage(r: Row): ChatMessage {
  return {
    id: String(r.id),
    threadId: String(r.thread_id),
    senderUserId: String(r.sender_user_id),
    body: String(r.body),
    kind: "text",
    createdAt: String(r.created_at),
    editedAt: r.edited_at ? String(r.edited_at) : null,
    deletedAt: r.deleted_at ? String(r.deleted_at) : null,
  };
}

function mapChatPresence(r: Row): ChatPresencePreference {
  return {
    userId: String(r.user_id),
    status: String(r.status) as ChatPresenceStatus,
    dndUntil: r.dnd_until ? String(r.dnd_until) : null,
    customStatus: r.custom_status ? String(r.custom_status) : null,
    lastSeenAt: String(r.last_seen_at),
    updatedAt: String(r.updated_at),
  };
}

function mapTimeEntry(r: Row): TimeEntry {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    clientId: r.client_id ? String(r.client_id) : null,
    requirementId: r.requirement_id ? String(r.requirement_id) : null,
    contractId: r.contract_id ? String(r.contract_id) : null,
    contractProfileId: r.contract_profile_id ? String(r.contract_profile_id) : null,
    category: String(r.category),
    taskDescription: String(r.task_description),
    date: String(r.date),
    startTime: String(r.start_time),
    endTime: r.end_time ? String(r.end_time) : null,
    durationMinutes: Number(r.duration_minutes),
    userId: String(r.user_id),
    observations: String(r.observations ?? ""),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapBudget(r: Row): BudgetAllocation {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    scope: String(r.scope),
    profileId: String(r.profile_id),
    quotedMinutes: Number(r.quoted_minutes),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapContract(r: Row): ContractBudget {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    projectId: String(r.project_id),
    scope: String(r.scope),
    code: String(r.code),
    name: String(r.name),
    startDate: String(r.start_date),
    endDate: String(r.end_date),
    rateUfPerHour: Number(r.rate_uf_per_hour),
    markupPercentage: Number(r.markup_percentage ?? 40),
    opexPercentage: Number(r.opex_percentage ?? 10),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapContractAllocation(r: Row): ContractProfileAllocation {
  return {
    id: String(r.id),
    contractId: String(r.contract_id),
    profileId: String(r.profile_id),
    quotedMinutes: Number(r.quoted_minutes),
    rateUfPerHour: r.rate_uf_per_hour === null ? null : Number(r.rate_uf_per_hour),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapCatalog(r: Row): SettingsCatalogEntry {
  return {
    id: String(r.id),
    kind: r.kind as SettingsCatalogKind,
    code: String(r.code),
    label: String(r.label),
    sortOrder: Number(r.sort_order),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapFinancialSettings(r: Row): FinancialReferenceRates {
  return {
    id: String(r.id),
    ufToClp: Number(r.uf_to_clp),
    usdToClp: Number(r.usd_to_clp),
    updatedAt: String(r.updated_at),
  };
}

export class RmsDataAccess {
  constructor(private readonly sb: SupabaseClient) {}

  async getClients(): Promise<Client[]> {
    const { data, error } = await this.sb.from("rms_clients").select("*").order("name");
    if (error) throw error;
    return (data as Row[]).map(mapClient);
  }

  async createClient(input: ClientCreateInput): Promise<Client> {
    const now = new Date().toISOString();
    const id = `client-${crypto.randomUUID().slice(0, 8)}`;
    const row = {
      id,
      name: input.name,
      code: input.code,
      active: input.active,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_clients").insert(row).select("*").single();
    if (error) throw error;
    return mapClient(data as Row);
  }

  async updateClient(id: string, input: ClientUpdateInput): Promise<Client | undefined> {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (input.name !== undefined) patch.name = input.name;
    if (input.code !== undefined) patch.code = input.code;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await this.sb.from("rms_clients").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? mapClient(data as Row) : undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const { error } = await this.sb.from("rms_clients").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await this.sb.from("rms_profiles").select("*").order("name");
    if (error) throw error;
    return (data as Row[]).map(mapProfile);
  }

  async createProfile(input: ProfileCreateInput): Promise<Profile> {
    const now = new Date().toISOString();
    const id = `prof-${crypto.randomUUID().slice(0, 8)}`;
    const row = {
      id,
      name: input.name,
      hourly_rate: input.hourlyRate,
      rate_currency: input.rateCurrency,
      active: input.active,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_profiles").insert(row).select("*").single();
    if (error) throw error;
    return mapProfile(data as Row);
  }

  async updateProfile(id: string, input: ProfileUpdateInput): Promise<Profile | undefined> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.hourlyRate !== undefined) patch.hourly_rate = input.hourlyRate;
    if (input.rateCurrency !== undefined) patch.rate_currency = input.rateCurrency;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await this.sb.from("rms_profiles").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? mapProfile(data as Row) : undefined;
  }

  async deleteProfile(id: string): Promise<boolean> {
    const { error } = await this.sb.from("rms_profiles").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await this.sb.from("rms_directory_users").select("*").order("name");
    if (error) throw error;
    return (data as Row[]).map(mapUser);
  }

  async createUser(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const now = new Date().toISOString();
    const id = `user-${crypto.randomUUID().slice(0, 8)}`;
    const row = {
      id,
      name: input.name,
      email: input.email,
      aliases: input.aliases,
      profile_id: input.profileId,
      active: input.active,
      role: input.role,
      auth_user_id: null,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_directory_users").insert(row).select("*").single();
    if (error) throw error;
    return mapUser(data as Row);
  }

  async updateUser(id: string, input: Partial<User>): Promise<User | undefined> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.email !== undefined) patch.email = input.email;
    if (input.aliases !== undefined) patch.aliases = input.aliases;
    if (input.profileId !== undefined) patch.profile_id = input.profileId;
    if (input.active !== undefined) patch.active = input.active;
    if (input.role !== undefined) patch.role = input.role;
    const { data, error } = await this.sb.from("rms_directory_users").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? mapUser(data as Row) : undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const { error } = await this.sb.from("rms_directory_users").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async getCatalogByKind(kind: SettingsCatalogKind): Promise<SettingsCatalogEntry[]> {
    const { data, error } = await this.sb
      .from("rms_settings_catalog")
      .select("*")
      .eq("kind", kind)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data as Row[]).map(mapCatalog);
  }

  async createCatalogEntry(input: CatalogCreateInput): Promise<SettingsCatalogEntry> {
    const now = new Date().toISOString();
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const row = {
      id,
      kind: input.kind,
      code: input.code,
      label: input.label,
      sort_order: input.sortOrder,
      active: input.active,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_settings_catalog").insert(row).select("*").single();
    if (error) throw error;
    return mapCatalog(data as Row);
  }

  async updateCatalogEntry(id: string, input: CatalogUpdateInput): Promise<SettingsCatalogEntry | undefined> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.code !== undefined) patch.code = input.code;
    if (input.label !== undefined) patch.label = input.label;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await this.sb.from("rms_settings_catalog").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? mapCatalog(data as Row) : undefined;
  }

  async deleteCatalogEntry(id: string): Promise<boolean> {
    const { error } = await this.sb.from("rms_settings_catalog").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async getRequirements(): Promise<Requirement[]> {
    const { data, error } = await this.sb.from("rms_requirements").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(mapRequirement);
  }

  async getRequirementById(id: string): Promise<Requirement | undefined> {
    const { data, error } = await this.sb.from("rms_requirements").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRequirement(data as Row) : undefined;
  }

  async createRequirement(input: RequirementInput): Promise<Requirement> {
    const now = new Date().toISOString();
    const id = `req-${crypto.randomUUID().slice(0, 8)}`;
    const row = {
      id,
      project_id: input.projectId,
      client_id: input.clientId,
      contract_id: input.contractId ?? null,
      origin: input.origin,
      title: input.title,
      description: input.description,
      priority: input.priority,
      owner_id: input.ownerId,
      status: input.status,
      notes: input.notes ?? "",
      created_at: now,
      updated_at: now,
      completed_at: input.status === "DONE_PROD" ? now : null,
    };
    const { data, error } = await this.sb.from("rms_requirements").insert(row).select("*").single();
    if (error) throw error;
    return mapRequirement(data as Row);
  }

  async updateRequirement(
    id: string,
    input: Partial<RequirementInput>,
    meta?: { changedById?: string },
  ): Promise<Requirement | undefined> {
    const current = await this.getRequirementById(id);
    if (!current) return undefined;
    const nextStatus = input.status ?? current.status;
    const now = new Date().toISOString();
    const patch: Row = {
      updated_at: now,
      project_id: input.projectId ?? current.projectId,
      client_id: input.clientId ?? current.clientId,
      contract_id: input.contractId === undefined ? current.contractId : input.contractId,
      origin: input.origin ?? current.origin,
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      priority: input.priority ?? current.priority,
      owner_id: input.ownerId ?? current.ownerId,
      status: nextStatus,
      notes: input.notes ?? current.notes,
      completed_at: nextStatus === "DONE_PROD" ? now : current.completedAt,
    };
    const { data, error } = await this.sb.from("rms_requirements").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    const result = data ? mapRequirement(data as Row) : undefined;
    if (result && meta?.changedById && current.status !== nextStatus) {
      const hid = `hist-${crypto.randomUUID().slice(0, 10)}`;
      const { error: hErr } = await this.sb.from("rms_requirement_status_history").insert({
        id: hid,
        requirement_id: id,
        from_status: current.status,
        to_status: nextStatus,
        changed_by_id: meta.changedById,
        changed_at: now,
      });
      if (hErr) throw hErr;
    }
    return result;
  }

  async deleteRequirement(id: string): Promise<boolean> {
    const { error } = await this.sb.from("rms_requirements").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async getRequirementComments(requirementId: string): Promise<RequirementComment[]> {
    const { data, error } = await this.sb
      .from("rms_requirement_comments")
      .select("*")
      .eq("requirement_id", requirementId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as Row[]).map((r) => ({
      id: String(r.id),
      requirementId: String(r.requirement_id),
      userId: String(r.user_id),
      body: String(r.body),
      createdAt: String(r.created_at),
    }));
  }

  async createRequirementComment(input: {
    requirementId: string;
    userId: string;
    body: string;
  }): Promise<RequirementComment> {
    const now = new Date().toISOString();
    const id = `comment-${crypto.randomUUID().slice(0, 10)}`;
    const row = {
      id,
      requirement_id: input.requirementId,
      user_id: input.userId,
      body: input.body,
      created_at: now,
    };
    const { data, error } = await this.sb.from("rms_requirement_comments").insert(row).select("*").single();
    if (error) throw error;
    const r = data as Row;
    return {
      id: String(r.id),
      requirementId: String(r.requirement_id),
      userId: String(r.user_id),
      body: String(r.body),
      createdAt: String(r.created_at),
    };
  }

  async getRequirementStatusHistory(requirementId: string): Promise<RequirementStatusHistory[]> {
    const { data, error } = await this.sb
      .from("rms_requirement_status_history")
      .select("*")
      .eq("requirement_id", requirementId)
      .order("changed_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map((r) => ({
      id: String(r.id),
      requirementId: String(r.requirement_id),
      fromStatus: String(r.from_status),
      toStatus: String(r.to_status),
      changedById: String(r.changed_by_id),
      changedAt: String(r.changed_at),
    }));
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    const { data, error } = await this.sb.from("rms_time_entries").select("*").order("date", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(mapTimeEntry);
  }

  async getTimeEntryById(id: string): Promise<TimeEntry | undefined> {
    const { data, error } = await this.sb.from("rms_time_entries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapTimeEntry(data as Row) : undefined;
  }

  async createTimeEntry(input: TimeEntryInput): Promise<TimeEntry> {
    const now = new Date().toISOString();
    const id = `time-${crypto.randomUUID().slice(0, 8)}`;
    const duration = calculateDurationMinutes(input.startTime, input.endTime);
    const row = {
      id,
      project_id: input.projectId,
      client_id: input.clientId ?? null,
      requirement_id: input.requirementId,
      contract_id: input.contractId ?? null,
      contract_profile_id: input.contractProfileId ?? null,
      category: input.category,
      task_description: input.taskDescription,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      duration_minutes: duration,
      user_id: input.userId,
      observations: input.observations ?? "",
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_time_entries").insert(row).select("*").single();
    if (error) throw error;
    return mapTimeEntry(data as Row);
  }

  async updateTimeEntry(id: string, input: Partial<TimeEntryInput>): Promise<TimeEntry | undefined> {
    const { data: existing, error: e1 } = await this.sb.from("rms_time_entries").select("*").eq("id", id).maybeSingle();
    if (e1) throw e1;
    if (!existing) return undefined;
    const cur = mapTimeEntry(existing as Row);
    const start = input.startTime ?? cur.startTime;
    const end = input.endTime === undefined ? cur.endTime : input.endTime;
    const patch = {
      project_id: input.projectId ?? cur.projectId,
      client_id: input.clientId === undefined ? cur.clientId : input.clientId,
      requirement_id: input.requirementId === undefined ? cur.requirementId : input.requirementId,
      contract_id: input.contractId === undefined ? cur.contractId : input.contractId,
      contract_profile_id: input.contractProfileId === undefined ? cur.contractProfileId : input.contractProfileId,
      category: input.category ?? cur.category,
      task_description: input.taskDescription ?? cur.taskDescription,
      date: input.date ?? cur.date,
      start_time: start,
      end_time: end,
      duration_minutes: calculateDurationMinutes(start, end),
      user_id: input.userId ?? cur.userId,
      observations: input.observations ?? cur.observations,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.sb.from("rms_time_entries").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? mapTimeEntry(data as Row) : undefined;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    const { error } = await this.sb.from("rms_time_entries").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async getBudgets(): Promise<BudgetAllocation[]> {
    const { data, error } = await this.sb
      .from("rms_contract_profile_allocations")
      .select("id, profile_id, quoted_minutes, created_at, updated_at, rms_contract_budgets!inner(project_id, scope)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map((row) =>
      mapBudget({
        id: row.id,
        profile_id: row.profile_id,
        quoted_minutes: row.quoted_minutes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        project_id: (row.rms_contract_budgets as Row).project_id,
        scope: (row.rms_contract_budgets as Row).scope,
      }),
    );
  }

  async getContractBudgets(): Promise<ContractBudget[]> {
    const { data, error } = await this.sb
      .from("rms_contract_budgets")
      .select("*")
      .order("start_date", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as Row[]).map(mapContract);
  }

  async createBudget(input: BudgetInput): Promise<ContractBudget> {
    const now = new Date().toISOString();
    const id = `contract-${crypto.randomUUID().slice(0, 8)}`;
    const row: Row = {
      id,
      client_id: input.clientId,
      project_id: input.projectId,
      scope: input.scope,
      code: input.code,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      rate_uf_per_hour: input.rateUfPerHour,
      markup_percentage: input.markupPercentage,
      opex_percentage: input.opexPercentage,
      active: true,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_contract_budgets").insert(row).select("*").single();
    if (error) throw error;
    const allocationRows = input.allocations.map((allocation) => ({
      id: `alloc-${crypto.randomUUID().slice(0, 10)}`,
      contract_id: id,
      profile_id: allocation.profileId,
      quoted_minutes: allocation.quotedMinutes,
      rate_uf_per_hour: allocation.rateUfPerHour,
      created_at: now,
      updated_at: now,
    }));
    const { error: allocationError } = await this.sb.from("rms_contract_profile_allocations").insert(allocationRows);
    if (allocationError) throw allocationError;
    return mapContract(data as Row);
  }

  async updateBudget(id: string, input: BudgetPatchInput): Promise<ContractBudget | undefined> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.clientId !== undefined) patch.client_id = input.clientId;
    if (input.projectId !== undefined) patch.project_id = input.projectId;
    if (input.scope !== undefined) patch.scope = input.scope;
    if (input.code !== undefined) patch.code = input.code;
    if (input.name !== undefined) patch.name = input.name;
    if (input.startDate !== undefined) patch.start_date = input.startDate;
    if (input.endDate !== undefined) patch.end_date = input.endDate;
    if (input.rateUfPerHour !== undefined) patch.rate_uf_per_hour = input.rateUfPerHour;
    if (input.markupPercentage !== undefined) patch.markup_percentage = input.markupPercentage;
    if (input.opexPercentage !== undefined) patch.opex_percentage = input.opexPercentage;
    const { data, error } = await this.sb.from("rms_contract_budgets").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    if (input.allocations) {
      const now = new Date().toISOString();
      const { error: deleteError } = await this.sb.from("rms_contract_profile_allocations").delete().eq("contract_id", id);
      if (deleteError) throw deleteError;
      const rows = input.allocations.map((allocation) => ({
        id: `alloc-${crypto.randomUUID().slice(0, 10)}`,
        contract_id: id,
        profile_id: allocation.profileId,
        quoted_minutes: allocation.quotedMinutes,
        rate_uf_per_hour: allocation.rateUfPerHour,
        created_at: now,
        updated_at: now,
      }));
      const { error: insertError } = await this.sb.from("rms_contract_profile_allocations").insert(rows);
      if (insertError) throw insertError;
    }
    return mapContract(data as Row);
  }

  async deleteBudget(id: string): Promise<boolean> {
    const { error: deleteAllocationsError } = await this.sb.from("rms_contract_profile_allocations").delete().eq("contract_id", id);
    if (deleteAllocationsError) throw deleteAllocationsError;
    const { error: deleteContractError } = await this.sb.from("rms_contract_budgets").delete().eq("id", id);
    if (deleteContractError) throw deleteContractError;
    return true;
  }

  async getContractProfileAllocations(contractId?: string): Promise<ContractProfileAllocation[]> {
    let query = this.sb.from("rms_contract_profile_allocations").select("*").order("created_at", { ascending: false });
    if (contractId) {
      query = query.eq("contract_id", contractId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as Row[]).map(mapContractAllocation);
  }

  async getFinancialReferenceRates(): Promise<FinancialReferenceRates> {
    const { data, error } = await this.sb.from("rms_financial_settings").select("*").eq("id", "default").maybeSingle();
    if (error) throw error;
    if (!data) {
      const now = new Date().toISOString();
      const seed = { id: "default", uf_to_clp: 39500, usd_to_clp: 950, updated_at: now };
      const { data: inserted, error: insertError } = await this.sb.from("rms_financial_settings").insert(seed).select("*").single();
      if (insertError) throw insertError;
      return mapFinancialSettings(inserted as Row);
    }
    return mapFinancialSettings(data as Row);
  }

  async updateFinancialReferenceRates(input: FinancialReferenceRatesUpdateInput): Promise<FinancialReferenceRates> {
    const now = new Date().toISOString();
    const row = {
      id: "default",
      uf_to_clp: input.ufToClp,
      usd_to_clp: input.usdToClp,
      updated_at: now,
    };
    const { data, error } = await this.sb.from("rms_financial_settings").upsert(row, { onConflict: "id" }).select("*").single();
    if (error) throw error;
    return mapFinancialSettings(data as Row);
  }

  async listNotificationsForUser(recipientUserId: string): Promise<AppNotification[]> {
    const { data, error } = await this.sb
      .from("rms_notifications")
      .select("*")
      .eq("recipient_user_id", recipientUserId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(mapAppNotification);
  }

  async getNotificationsUnreadCount(recipientUserId: string): Promise<number> {
    const { count, error } = await this.sb
      .from("rms_notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", recipientUserId)
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  }

  async createAppNotification(input: CreateAppNotificationInput): Promise<AppNotification> {
    const now = new Date().toISOString();
    const id = `notif-${crypto.randomUUID().slice(0, 12)}`;
    const row = {
      id,
      recipient_user_id: input.recipientUserId,
      title: input.title,
      body: input.body,
      href: input.href,
      read_at: null as string | null,
      created_at: now,
    };
    const { data, error } = await this.sb.from("rms_notifications").insert(row).select("*").single();
    if (error) throw error;
    return mapAppNotification(data as Row);
  }

  async markNotificationReadForUser(notificationId: string, recipientUserId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const { data, error } = await this.sb
      .from("rms_notifications")
      .update({ read_at: now })
      .eq("id", notificationId)
      .eq("recipient_user_id", recipientUserId)
      .is("read_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async getChatThreadsForUser(userId: string): Promise<ChatThread[]> {
    const { data: hiddenRows, error: hiddenError } = await this.sb
      .from("rms_chat_thread_hidden_for_user")
      .select("thread_id")
      .eq("user_id", userId);
    if (hiddenError) throw hiddenError;
    const hiddenIds = ((hiddenRows as Array<{ thread_id: string }> | null) ?? []).map((row) => row.thread_id);

    const { data, error } = await this.sb
      .from("rms_chat_thread_members")
      .select("rms_chat_threads!inner(*)")
      .eq("user_id", userId);
    if (error) throw error;
    return ((data as Row[]) ?? [])
      .map((row) => row.rms_chat_threads as Row)
      .filter(Boolean)
      .filter((row) => !hiddenIds.includes(String(row.id)))
      .map(mapChatThread)
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  }

  async getChatThreadMembers(threadId: string): Promise<ChatThreadMember[]> {
    const { data, error } = await this.sb
      .from("rms_chat_thread_members")
      .select("*")
      .eq("thread_id", threadId)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return (data as Row[]).map(mapChatThreadMember);
  }

  async getChatMessages(threadId: string, limit = 100, viewerUserId?: string): Promise<ChatMessage[]> {
    let hiddenIds: string[] = [];
    if (viewerUserId) {
      const { data: hiddenRows, error: hiddenError } = await this.sb
        .from("rms_chat_message_hidden_for_user")
        .select("message_id")
        .eq("user_id", viewerUserId);
      if (hiddenError) throw hiddenError;
      hiddenIds = ((hiddenRows as Array<{ message_id: string }> | null) ?? []).map((row) => row.message_id);
    }
    let query = this.sb
      .from("rms_chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, limit));
    if (hiddenIds.length > 0) {
      const hiddenFilter = hiddenIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
      query = query.not("id", "in", `(${hiddenFilter})`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as Row[]).map(mapChatMessage).reverse();
  }

  async createDirectChatThread(input: { createdByUserId: string; peerUserId: string }): Promise<ChatThread> {
    const directKey = [input.createdByUserId, input.peerUserId].sort().join(":");
    const existing = await this.sb
      .from("rms_chat_threads")
      .select("*")
      .eq("type", "direct")
      .eq("direct_key", directKey)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      const { error: unhideError } = await this.sb
        .from("rms_chat_thread_hidden_for_user")
        .delete()
        .eq("thread_id", String((existing.data as Row).id))
        .eq("user_id", input.createdByUserId);
      if (unhideError) throw unhideError;
      return mapChatThread(existing.data as Row);
    }
    const now = new Date().toISOString();
    const threadId = `thread-${crypto.randomUUID().slice(0, 10)}`;
    const { data, error } = await this.sb
      .from("rms_chat_threads")
      .insert({
        id: threadId,
        type: "direct",
        name: null,
        direct_key: directKey,
        created_by_user_id: input.createdByUserId,
        created_at: now,
        updated_at: now,
        last_message_at: null,
      })
      .select("*")
      .single();
    if (error) throw error;
    const members = [
      { thread_id: threadId, user_id: input.createdByUserId, role: "owner", muted_until: null, joined_at: now, last_read_message_id: null },
      { thread_id: threadId, user_id: input.peerUserId, role: "member", muted_until: null, joined_at: now, last_read_message_id: null },
    ];
    const { error: membersError } = await this.sb.from("rms_chat_thread_members").insert(members);
    if (membersError) throw membersError;
    return mapChatThread(data as Row);
  }

  async createChatChannel(input: { createdByUserId: string; name: string; memberUserIds: string[] }): Promise<ChatThread> {
    const now = new Date().toISOString();
    const threadId = `thread-${crypto.randomUUID().slice(0, 10)}`;
    const { data, error } = await this.sb
      .from("rms_chat_threads")
      .insert({
        id: threadId,
        type: "channel",
        name: input.name,
        direct_key: null,
        created_by_user_id: input.createdByUserId,
        created_at: now,
        updated_at: now,
        last_message_at: null,
      })
      .select("*")
      .single();
    if (error) throw error;
    const users = [...new Set([input.createdByUserId, ...input.memberUserIds])];
    const members = users.map((userId) => ({
      thread_id: threadId,
      user_id: userId,
      role: userId === input.createdByUserId ? "owner" : "member",
      muted_until: null,
      joined_at: now,
      last_read_message_id: null,
    }));
    const { error: membersError } = await this.sb.from("rms_chat_thread_members").insert(members);
    if (membersError) throw membersError;
    return mapChatThread(data as Row);
  }

  async sendChatMessage(input: { threadId: string; senderUserId: string; body: string }): Promise<ChatMessage> {
    const now = new Date().toISOString();
    const id = `msg-${crypto.randomUUID().slice(0, 12)}`;
    const { data, error } = await this.sb
      .from("rms_chat_messages")
      .insert({
        id,
        thread_id: input.threadId,
        sender_user_id: input.senderUserId,
        body: input.body,
        kind: "text",
        created_at: now,
        edited_at: null,
        deleted_at: null,
      })
      .select("*")
      .single();
    if (error) throw error;
    const { error: threadError } = await this.sb
      .from("rms_chat_threads")
      .update({ last_message_at: now, updated_at: now })
      .eq("id", input.threadId);
    if (threadError) throw threadError;
    return mapChatMessage(data as Row);
  }

  async hideChatMessageForUser(input: { messageId: string; userId: string }): Promise<boolean> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("rms_chat_message_hidden_for_user").upsert(
      {
        message_id: input.messageId,
        user_id: input.userId,
        hidden_at: now,
      },
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return true;
  }

  async unhideChatMessageForUser(input: { messageId: string; userId: string }): Promise<boolean> {
    const { error } = await this.sb
      .from("rms_chat_message_hidden_for_user")
      .delete()
      .eq("message_id", input.messageId)
      .eq("user_id", input.userId);
    if (error) throw error;
    return true;
  }

  async hideChatThreadForUser(input: { threadId: string; userId: string }): Promise<boolean> {
    const now = new Date().toISOString();
    const { error } = await this.sb.from("rms_chat_thread_hidden_for_user").upsert(
      {
        thread_id: input.threadId,
        user_id: input.userId,
        hidden_at: now,
      },
      { onConflict: "thread_id,user_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return true;
  }

  async unhideChatThreadForUser(input: { threadId: string; userId: string }): Promise<boolean> {
    const { error } = await this.sb
      .from("rms_chat_thread_hidden_for_user")
      .delete()
      .eq("thread_id", input.threadId)
      .eq("user_id", input.userId);
    if (error) throw error;
    return true;
  }

  async markChatThreadRead(input: { threadId: string; userId: string; lastReadMessageId: string | null }): Promise<void> {
    const { error } = await this.sb
      .from("rms_chat_thread_members")
      .update({ last_read_message_id: input.lastReadMessageId })
      .eq("thread_id", input.threadId)
      .eq("user_id", input.userId);
    if (error) throw error;
  }

  async getChatPresencePreferences(userIds: string[]): Promise<ChatPresencePreference[]> {
    if (userIds.length === 0) return [];
    const { data, error } = await this.sb.from("rms_chat_presence_preferences").select("*").in("user_id", userIds);
    if (error) throw error;
    return (data as Row[]).map(mapChatPresence);
  }

  async upsertChatPresencePreference(input: {
    userId: string;
    status: ChatPresenceStatus;
    dndUntil: string | null;
    customStatus: string | null;
  }): Promise<ChatPresencePreference> {
    const now = new Date().toISOString();
    const { data, error } = await this.sb
      .from("rms_chat_presence_preferences")
      .upsert(
        {
          user_id: input.userId,
          status: input.status,
          dnd_until: input.dndUntil,
          custom_status: input.customStatus,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return mapChatPresence(data as Row);
  }

  async touchChatPresenceHeartbeat(userId: string): Promise<ChatPresencePreference> {
    const now = new Date().toISOString();
    const current = await this.sb.from("rms_chat_presence_preferences").select("*").eq("user_id", userId).maybeSingle();
    if (current.error) throw current.error;
    const { data, error } = await this.sb
      .from("rms_chat_presence_preferences")
      .upsert(
        {
          user_id: userId,
          status: (current.data?.status as ChatPresenceStatus | undefined) ?? "online",
          dnd_until: current.data?.dnd_until ?? null,
          custom_status: current.data?.custom_status ?? null,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return mapChatPresence(data as Row);
  }

  async appendAudit(entry: {
    entityType: string;
    entityId: string;
    action: string;
    beforeJson: string;
    afterJson: string;
    userId: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const id = `audit-${crypto.randomUUID().slice(0, 12)}`;
    const { error } = await this.sb.from("rms_audit_logs").insert({
      id,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      before_json: entry.beforeJson,
      after_json: entry.afterJson,
      user_id: entry.userId,
      created_at: now,
    });
    if (error) throw error;
  }
}
