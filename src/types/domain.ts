export type Role = "Admin" | "Project Manager" | "Contributor" | "Viewer";

export type SettingsCatalogKind =
  | "requirement_status"
  | "requirement_priority"
  | "time_entry_category"
  | "budget_scope";

export interface SettingsCatalogEntry {
  id: string;
  kind: SettingsCatalogKind;
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  clientName: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Requirement {
  id: string;
  projectId: string;
  clientId: string;
  contractId: string | null;
  origin: string;
  title: string;
  description: string;
  /** Código de prioridad configurado en catálogo */
  priority: string;
  ownerId: string;
  /** Código de estado configurado en catálogo */
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  aliases: string[];
  profileId: string;
  active: boolean;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  hourlyRate: number;
  rateCurrency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fila única de referencia para lecturas cruzadas (UF y USD en pesos) y parámetros de equipo. */
export interface FinancialReferenceRates {
  id: string;
  ufToClp: number;
  usdToClp: number;
  /** Capacidad laboral semanal estándar en horas por persona (defecto: 40). */
  weeklyCapacityHours: number;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  clientId: string | null;
  requirementId: string | null;
  contractId: string | null;
  contractProfileId: string | null;
  /** Código de categoría según catálogo */
  category: string;
  taskDescription: string;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  userId: string;
  observations: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAllocation {
  id: string;
  projectId: string;
  /** Código de scope según catálogo */
  scope: string;
  profileId: string;
  quotedMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractBudget {
  id: string;
  clientId: string;
  projectId: string;
  scope: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  rateUfPerHour: number;
  markupPercentage: number;
  opexPercentage: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContractProfileAllocation {
  id: string;
  contractId: string;
  profileId: string;
  quotedMinutes: number;
  rateUfPerHour: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Una fila de la cubicación asociada a un contrato. */
export interface CubicacionItem {
  id: string;
  contractId: string;
  /** Requerimiento al que pertenece esta actividad (opcional). */
  requirementId: string | null;
  activityName: string;
  /** Horas brutas de construcción ingresadas por el PM (el único input manual). */
  construccionHours: number;
  /** Porcentajes de fase (ajustables por fila). */
  levantamientoPct: number;
  disenoPct: number;
  qaAjustesPct: number;
  puestaEnMarchaPct: number;
  /** Porcentajes de distribución por perfil (ajustables por fila). */
  seniorPct: number;
  ingeneroPct: number;
  juniorPct: number;
  /** Horas directas para perfiles que no pasan por el cálculo de porcentajes. */
  directorHours: number;
  disenadorHours: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementComment {
  id: string;
  requirementId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface RequirementStatusHistory {
  id: string;
  requirementId: string;
  fromStatus: string;
  toStatus: string;
  changedById: string;
  changedAt: string;
}

export type RequirementTaskStatus = "pending" | "in_progress" | "done";

export interface RequirementTask {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  status: RequirementTaskStatus;
  estimatedHours: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: string;
  afterJson: string;
  userId: string;
  createdAt: string;
}

/** Aviso in-app dirigido a un usuario del directorio (`rms_directory_users.id`). */
export interface AppNotification {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export type ChatThreadType = "direct" | "channel";
export type ChatPresenceStatus = "online" | "away" | "dnd" | "offline";

export interface ChatThread {
  id: string;
  type: ChatThreadType;
  name: string | null;
  directKey: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface ChatThreadMember {
  threadId: string;
  userId: string;
  role: "member" | "owner";
  mutedUntil: string | null;
  joinedAt: string;
  lastReadMessageId: string | null;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  kind: "text";
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface ChatPresencePreference {
  userId: string;
  status: ChatPresenceStatus;
  dndUntil: string | null;
  customStatus: string | null;
  lastSeenAt: string;
  updatedAt: string;
}

export interface DashboardFilters {
  projectId?: string;
  clientId?: string;
  from?: string;
  to?: string;
  ownerId?: string;
  status?: string;
  priority?: string;
  category?: string;
}
