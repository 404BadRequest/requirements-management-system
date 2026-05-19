import type { QueryResultRow } from "pg";
import type { BudgetInput, BudgetPatchInput } from "@/schemas/budget-schema";
import type { RequirementInput } from "@/schemas/requirement-schema";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";
import type { FinancialReferenceRatesUpdateInput } from "@/data/contracts/financial-reference-rates-contract";
import type { CreateAppNotificationInput } from "@/data/contracts/notifications-contract";
import type { ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import type { CatalogCreateInput, CatalogUpdateInput } from "@/data/contracts/settings-catalog-contract";
import { calculateDurationMinutes } from "@/lib/calculations/time";
import { queryPg } from "@/lib/postgres/client";
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

type Row = QueryResultRow & Record<string, unknown>;

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
  const aliasesRaw = r.aliases;
  const aliases =
    Array.isArray(aliasesRaw) ? aliasesRaw.map((v) => String(v)) : JSON.parse(String(aliasesRaw ?? "[]")) as string[];
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

function mapTimeEntry(r: Row): TimeEntry {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    requirementId: r.requirement_id ? String(r.requirement_id) : null,
    contractId: r.contract_id ? String(r.contract_id) : null,
    category: String(r.category),
    taskDescription: String(r.task_description),
    date: String(r.date),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
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

function mapNotification(r: Row): AppNotification {
  return {
    id: String(r.id),
    recipientUserId: String(r.recipient_user_id),
    title: String(r.title),
    body: String(r.body),
    href: r.href ? String(r.href) : null,
    readAt: r.read_at ? String(r.read_at) : null,
    createdAt: String(r.created_at),
  };
}

export class PostgresDataProvider implements AppDataProvider {
  async getClients(): Promise<Client[]> {
    const { rows } = await queryPg<Row>("select * from rms_clients order by name");
    return rows.map(mapClient);
  }
  async createClient(input: ClientCreateInput): Promise<Client> {
    const now = new Date().toISOString();
    const id = `client-${crypto.randomUUID().slice(0, 8)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_clients (id, name, code, active, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [id, input.name, input.code, input.active, now, now],
    );
    return mapClient(rows[0]);
  }
  async updateClient(id: string, input: ClientUpdateInput): Promise<Client | undefined> {
    const now = new Date().toISOString();
    const { rows } = await queryPg<Row>(
      `update rms_clients
       set name = coalesce($2, name),
           code = coalesce($3, code),
           active = coalesce($4, active),
           updated_at = $5
       where id = $1
       returning *`,
      [id, input.name ?? null, input.code ?? null, input.active ?? null, now],
    );
    return rows[0] ? mapClient(rows[0]) : undefined;
  }
  async deleteClient(id: string): Promise<boolean> {
    const { rowCount } = await queryPg("delete from rms_clients where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getProfiles(): Promise<Profile[]> {
    const { rows } = await queryPg<Row>("select * from rms_profiles order by name");
    return rows.map(mapProfile);
  }
  async createProfile(input: ProfileCreateInput): Promise<Profile> {
    const now = new Date().toISOString();
    const id = `prof-${crypto.randomUUID().slice(0, 8)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_profiles (id, name, hourly_rate, rate_currency, active, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, input.name, input.hourlyRate, input.rateCurrency, input.active, now, now],
    );
    return mapProfile(rows[0]);
  }
  async updateProfile(id: string, input: ProfileUpdateInput): Promise<Profile | undefined> {
    const now = new Date().toISOString();
    const { rows } = await queryPg<Row>(
      `update rms_profiles
       set name = coalesce($2, name),
           hourly_rate = coalesce($3, hourly_rate),
           rate_currency = coalesce($4, rate_currency),
           active = coalesce($5, active),
           updated_at = $6
       where id = $1
       returning *`,
      [id, input.name ?? null, input.hourlyRate ?? null, input.rateCurrency ?? null, input.active ?? null, now],
    );
    return rows[0] ? mapProfile(rows[0]) : undefined;
  }
  async deleteProfile(id: string): Promise<boolean> {
    const { rowCount } = await queryPg("delete from rms_profiles where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getUsers(): Promise<User[]> {
    const { rows } = await queryPg<Row>("select * from rms_directory_users order by name");
    return rows.map(mapUser);
  }
  async createUser(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const now = new Date().toISOString();
    const id = `user-${crypto.randomUUID().slice(0, 8)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_directory_users (id, name, email, aliases, profile_id, active, role, auth_user_id, created_at, updated_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, null, $8, $9)
       returning *`,
      [id, input.name, input.email, JSON.stringify(input.aliases ?? []), input.profileId, input.active, input.role, now, now],
    );
    return mapUser(rows[0]);
  }
  async updateUser(id: string, input: Partial<User>): Promise<User | undefined> {
    const now = new Date().toISOString();
    const aliases = input.aliases === undefined ? null : JSON.stringify(input.aliases);
    const { rows } = await queryPg<Row>(
      `update rms_directory_users
       set name = coalesce($2, name),
           email = coalesce($3, email),
           aliases = coalesce($4::jsonb, aliases),
           profile_id = coalesce($5, profile_id),
           active = coalesce($6, active),
           role = coalesce($7, role),
           updated_at = $8
       where id = $1
       returning *`,
      [id, input.name ?? null, input.email ?? null, aliases, input.profileId ?? null, input.active ?? null, input.role ?? null, now],
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }
  async deleteUser(id: string): Promise<boolean> {
    const { rowCount } = await queryPg("delete from rms_directory_users where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getCatalogByKind(kind: SettingsCatalogKind): Promise<SettingsCatalogEntry[]> {
    const { rows } = await queryPg<Row>("select * from rms_settings_catalog where kind = $1 order by sort_order asc", [kind]);
    return rows.map(mapCatalog);
  }
  async createCatalogEntry(input: CatalogCreateInput): Promise<SettingsCatalogEntry> {
    const now = new Date().toISOString();
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_settings_catalog (id, kind, code, label, sort_order, active, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, input.kind, input.code, input.label, input.sortOrder, input.active, now, now],
    );
    return mapCatalog(rows[0]);
  }
  async updateCatalogEntry(id: string, input: CatalogUpdateInput): Promise<SettingsCatalogEntry | undefined> {
    const now = new Date().toISOString();
    const { rows } = await queryPg<Row>(
      `update rms_settings_catalog
       set code = coalesce($2, code),
           label = coalesce($3, label),
           sort_order = coalesce($4, sort_order),
           active = coalesce($5, active),
           updated_at = $6
       where id = $1
       returning *`,
      [id, input.code ?? null, input.label ?? null, input.sortOrder ?? null, input.active ?? null, now],
    );
    return rows[0] ? mapCatalog(rows[0]) : undefined;
  }
  async deleteCatalogEntry(id: string): Promise<boolean> {
    const { rowCount } = await queryPg("delete from rms_settings_catalog where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getRequirements(): Promise<Requirement[]> {
    const { rows } = await queryPg<Row>("select * from rms_requirements order by updated_at desc");
    return rows.map(mapRequirement);
  }
  async getRequirementById(id: string): Promise<Requirement | undefined> {
    const { rows } = await queryPg<Row>("select * from rms_requirements where id = $1", [id]);
    return rows[0] ? mapRequirement(rows[0]) : undefined;
  }
  async createRequirement(input: RequirementInput): Promise<Requirement> {
    const now = new Date().toISOString();
    const id = `req-${crypto.randomUUID().slice(0, 8)}`;
    const completedAt = input.status === "DONE_PROD" ? now : null;
    const { rows } = await queryPg<Row>(
      `insert into rms_requirements
       (id, project_id, client_id, contract_id, origin, title, description, priority, owner_id, status, notes, created_at, updated_at, completed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning *`,
      [
        id,
        input.projectId,
        input.clientId,
        input.contractId ?? null,
        input.origin,
        input.title,
        input.description,
        input.priority,
        input.ownerId,
        input.status,
        input.notes ?? "",
        now,
        now,
        completedAt,
      ],
    );
    return mapRequirement(rows[0]);
  }
  async updateRequirement(
    id: string,
    input: Partial<RequirementInput>,
    meta?: { changedById?: string },
  ): Promise<Requirement | undefined> {
    const current = await this.getRequirementById(id);
    if (!current) return undefined;
    const now = new Date().toISOString();
    const nextStatus = input.status ?? current.status;
    const { rows } = await queryPg<Row>(
      `update rms_requirements
       set project_id = $2,
           client_id = $3,
           contract_id = $4,
           origin = $5,
           title = $6,
           description = $7,
           priority = $8,
           owner_id = $9,
           status = $10,
           notes = $11,
           completed_at = $12,
           updated_at = $13
       where id = $1
       returning *`,
      [
        id,
        input.projectId ?? current.projectId,
        input.clientId ?? current.clientId,
        input.contractId === undefined ? current.contractId : input.contractId,
        input.origin ?? current.origin,
        input.title ?? current.title,
        input.description ?? current.description,
        input.priority ?? current.priority,
        input.ownerId ?? current.ownerId,
        nextStatus,
        input.notes ?? current.notes,
        nextStatus === "DONE_PROD" ? now : current.completedAt,
        now,
      ],
    );
    const updated = rows[0] ? mapRequirement(rows[0]) : undefined;
    if (updated && meta?.changedById && current.status !== nextStatus) {
      await queryPg(
        `insert into rms_requirement_status_history
         (id, requirement_id, from_status, to_status, changed_by_id, changed_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [`hist-${crypto.randomUUID().slice(0, 10)}`, id, current.status, nextStatus, meta.changedById, now],
      );
    }
    return updated;
  }
  async deleteRequirement(id: string): Promise<boolean> {
    const { rowCount } = await queryPg("delete from rms_requirements where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
  async getRequirementComments(requirementId: string): Promise<RequirementComment[]> {
    const { rows } = await queryPg<Row>(
      "select * from rms_requirement_comments where requirement_id = $1 order by created_at asc",
      [requirementId],
    );
    return rows.map((r: Row) => ({
      id: String(r.id),
      requirementId: String(r.requirement_id),
      userId: String(r.user_id),
      body: String(r.body),
      createdAt: String(r.created_at),
    }));
  }
  async createRequirementComment(input: { requirementId: string; userId: string; body: string }): Promise<RequirementComment> {
    const now = new Date().toISOString();
    const id = `comment-${crypto.randomUUID().slice(0, 10)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_requirement_comments (id, requirement_id, user_id, body, created_at)
       values ($1,$2,$3,$4,$5)
       returning *`,
      [id, input.requirementId, input.userId, input.body, now],
    );
    const row = rows[0];
    return {
      id: String(row.id),
      requirementId: String(row.requirement_id),
      userId: String(row.user_id),
      body: String(row.body),
      createdAt: String(row.created_at),
    };
  }
  async getRequirementStatusHistory(requirementId: string): Promise<RequirementStatusHistory[]> {
    const { rows } = await queryPg<Row>(
      "select * from rms_requirement_status_history where requirement_id = $1 order by changed_at desc",
      [requirementId],
    );
    return rows.map((r: Row) => ({
      id: String(r.id),
      requirementId: String(r.requirement_id),
      fromStatus: String(r.from_status),
      toStatus: String(r.to_status),
      changedById: String(r.changed_by_id),
      changedAt: String(r.changed_at),
    }));
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    const { rows } = await queryPg<Row>("select * from rms_time_entries order by date desc");
    return rows.map(mapTimeEntry);
  }
  async getTimeEntryById(id: string): Promise<TimeEntry | undefined> {
    const { rows } = await queryPg<Row>("select * from rms_time_entries where id = $1", [id]);
    return rows[0] ? mapTimeEntry(rows[0]) : undefined;
  }
  async createTimeEntry(input: TimeEntryInput): Promise<TimeEntry> {
    const now = new Date().toISOString();
    const id = `time-${crypto.randomUUID().slice(0, 8)}`;
    const duration = calculateDurationMinutes(input.startTime, input.endTime);
    const { rows } = await queryPg<Row>(
      `insert into rms_time_entries
       (id, project_id, requirement_id, contract_id, category, task_description, date, start_time, end_time, duration_minutes, user_id, observations, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning *`,
      [
        id,
        input.projectId,
        input.requirementId,
        input.contractId ?? null,
        input.category,
        input.taskDescription,
        input.date,
        input.startTime,
        input.endTime,
        duration,
        input.userId,
        input.observations ?? "",
        now,
        now,
      ],
    );
    return mapTimeEntry(rows[0]);
  }
  async updateTimeEntry(id: string, input: Partial<TimeEntryInput>): Promise<TimeEntry | undefined> {
    const current = await this.getTimeEntryById(id);
    if (!current) return undefined;
    const start = input.startTime ?? current.startTime;
    const end = input.endTime ?? current.endTime;
    const patch = {
      projectId: input.projectId ?? current.projectId,
      requirementId: input.requirementId === undefined ? current.requirementId : input.requirementId,
      category: input.category ?? current.category,
      taskDescription: input.taskDescription ?? current.taskDescription,
      date: input.date ?? current.date,
      startTime: start,
      endTime: end,
      durationMinutes: calculateDurationMinutes(start, end),
      userId: input.userId ?? current.userId,
      observations: input.observations ?? current.observations,
      updatedAt: new Date().toISOString(),
    };
    const { rows } = await queryPg<Row>(
      `update rms_time_entries
       set project_id = $2,
           requirement_id = $3,
           contract_id = $4,
           category = $5,
           task_description = $6,
           date = $7,
           start_time = $8,
           end_time = $9,
           duration_minutes = $10,
           user_id = $11,
           observations = $12,
           updated_at = $13
       where id = $1
       returning *`,
      [
        id,
        patch.projectId,
        patch.requirementId,
        input.contractId === undefined ? current.contractId : input.contractId,
        patch.category,
        patch.taskDescription,
        patch.date,
        patch.startTime,
        patch.endTime,
        patch.durationMinutes,
        patch.userId,
        patch.observations,
        patch.updatedAt,
      ],
    );
    return rows[0] ? mapTimeEntry(rows[0]) : undefined;
  }
  async deleteTimeEntry(id: string): Promise<boolean> {
    const { rowCount } = await queryPg("delete from rms_time_entries where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getBudgets(): Promise<BudgetAllocation[]> {
    const { rows } = await queryPg<Row>(
      `select a.id, c.project_id, c.scope, a.profile_id, a.quoted_minutes, a.created_at, a.updated_at
         from rms_contract_profile_allocations a
         join rms_contract_budgets c on c.id = a.contract_id
        order by c.start_date desc, c.name asc`,
    );
    return rows.map(mapBudget);
  }
  async getContractBudgets(): Promise<ContractBudget[]> {
    const { rows } = await queryPg<Row>("select * from rms_contract_budgets order by start_date desc, name asc");
    return rows.map(mapContract);
  }
  async createBudget(input: BudgetInput): Promise<ContractBudget> {
    const now = new Date().toISOString();
    const id = `contract-${crypto.randomUUID().slice(0, 8)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_contract_budgets
       (id, client_id, project_id, scope, code, name, start_date, end_date, rate_uf_per_hour, active, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11)
       returning *`,
      [id, input.clientId, input.projectId, input.scope, input.code, input.name, input.startDate, input.endDate, input.rateUfPerHour, now, now],
    );
    for (const allocation of input.allocations) {
      await queryPg(
        `insert into rms_contract_profile_allocations
         (id, contract_id, profile_id, quoted_minutes, rate_uf_per_hour, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          `alloc-${crypto.randomUUID().slice(0, 10)}`,
          id,
          allocation.profileId,
          allocation.quotedMinutes,
          allocation.rateUfPerHour,
          now,
          now,
        ],
      );
    }
    return mapContract(rows[0]);
  }
  async updateBudget(id: string, input: BudgetPatchInput): Promise<ContractBudget | undefined> {
    const now = new Date().toISOString();
    const currentRows = await queryPg<Row>("select * from rms_contract_budgets where id = $1", [id]);
    if (!currentRows.rows[0]) return undefined;
    const { rows } = await queryPg<Row>(
      `update rms_contract_budgets
       set client_id = coalesce($2, client_id),
           project_id = coalesce($3, project_id),
           scope = coalesce($4, scope),
           code = coalesce($5, code),
           name = coalesce($6, name),
           start_date = coalesce($7, start_date),
           end_date = coalesce($8, end_date),
           rate_uf_per_hour = coalesce($9, rate_uf_per_hour),
           updated_at = $10
       where id = $1
       returning *`,
      [
        id,
        input.clientId ?? null,
        input.projectId ?? null,
        input.scope ?? null,
        input.code ?? null,
        input.name ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        input.rateUfPerHour ?? null,
        now,
      ],
    );
    if (!rows[0]) return undefined;
    if (input.allocations) {
      await queryPg("delete from rms_contract_profile_allocations where contract_id = $1", [id]);
      for (const allocation of input.allocations) {
        await queryPg(
          `insert into rms_contract_profile_allocations
           (id, contract_id, profile_id, quoted_minutes, rate_uf_per_hour, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [
            `alloc-${crypto.randomUUID().slice(0, 10)}`,
            id,
            allocation.profileId,
            allocation.quotedMinutes,
            allocation.rateUfPerHour,
            now,
            now,
          ],
        );
      }
    }
    return mapContract(rows[0]);
  }
  async deleteBudget(id: string): Promise<boolean> {
    await queryPg("delete from rms_contract_profile_allocations where contract_id = $1", [id]);
    const { rowCount } = await queryPg("delete from rms_contract_budgets where id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
  async getContractProfileAllocations(contractId?: string): Promise<ContractProfileAllocation[]> {
    const { rows } = contractId
      ? await queryPg<Row>("select * from rms_contract_profile_allocations where contract_id = $1 order by created_at asc", [contractId])
      : await queryPg<Row>("select * from rms_contract_profile_allocations order by created_at asc");
    return rows.map(mapContractAllocation);
  }

  async getFinancialReferenceRates(): Promise<FinancialReferenceRates> {
    const { rows } = await queryPg<Row>("select * from rms_financial_settings where id = 'default'");
    if (!rows[0]) {
      const now = new Date().toISOString();
      const inserted = await queryPg<Row>(
        `insert into rms_financial_settings (id, uf_to_clp, usd_to_clp, updated_at)
         values ('default', 39500, 950, $1)
         returning *`,
        [now],
      );
      return mapFinancialSettings(inserted.rows[0]);
    }
    return mapFinancialSettings(rows[0]);
  }
  async updateFinancialReferenceRates(input: FinancialReferenceRatesUpdateInput): Promise<FinancialReferenceRates> {
    const now = new Date().toISOString();
    const { rows } = await queryPg<Row>(
      `insert into rms_financial_settings (id, uf_to_clp, usd_to_clp, updated_at)
       values ('default', $1, $2, $3)
       on conflict (id)
       do update set uf_to_clp = excluded.uf_to_clp, usd_to_clp = excluded.usd_to_clp, updated_at = excluded.updated_at
       returning *`,
      [input.ufToClp, input.usdToClp, now],
    );
    return mapFinancialSettings(rows[0]);
  }

  async listNotificationsForUser(recipientUserId: string): Promise<AppNotification[]> {
    const { rows } = await queryPg<Row>(
      "select * from rms_notifications where recipient_user_id = $1 order by created_at desc",
      [recipientUserId],
    );
    return rows.map(mapNotification);
  }
  async getNotificationsUnreadCount(recipientUserId: string): Promise<number> {
    const { rows } = await queryPg<Row>(
      "select count(*)::int as total from rms_notifications where recipient_user_id = $1 and read_at is null",
      [recipientUserId],
    );
    return Number(rows[0]?.total ?? 0);
  }
  async createAppNotification(input: CreateAppNotificationInput): Promise<AppNotification> {
    const now = new Date().toISOString();
    const id = `notif-${crypto.randomUUID().slice(0, 12)}`;
    const { rows } = await queryPg<Row>(
      `insert into rms_notifications (id, recipient_user_id, title, body, href, read_at, created_at)
       values ($1, $2, $3, $4, $5, null, $6)
       returning *`,
      [id, input.recipientUserId, input.title, input.body, input.href, now],
    );
    return mapNotification(rows[0]);
  }
  async markNotificationReadForUser(notificationId: string, recipientUserId: string): Promise<boolean> {
    const { rowCount } = await queryPg(
      `update rms_notifications
       set read_at = $3
       where id = $1 and recipient_user_id = $2 and read_at is null`,
      [notificationId, recipientUserId, new Date().toISOString()],
    );
    return (rowCount ?? 0) > 0;
  }

  async appendAudit(entry: AuditEntryInput): Promise<void> {
    await queryPg(
      `insert into rms_audit_logs (id, entity_type, entity_id, action, before_json, after_json, user_id, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        `audit-${crypto.randomUUID().slice(0, 12)}`,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.beforeJson,
        entry.afterJson,
        entry.userId,
        new Date().toISOString(),
      ],
    );
  }
}
