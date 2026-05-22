"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCatalogEntry,
  createClient,
  createProfile,
  createUser,
  deleteCatalogEntry,
  deleteClient,
  deleteProfile,
  deleteUser,
  getBudgets,
  getCatalogByKind,
  getRequirements,
  getTimeEntries,
  getUsers,
  updateCatalogEntry,
  updateClient,
  updateProfile,
  updateUser,
  updateFinancialReferenceRates,
} from "@/data/repositories/server-db";
import type { Role, SettingsCatalogKind, SettingsCatalogEntry } from "@/types/domain";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { recordAuditSafely } from "@/lib/audit/record-audit";
import { getAuthProviderKind, isPostgresConfigured } from "@/lib/postgres/env";
import { queryPg } from "@/lib/postgres/client";
import { hashPassword } from "@/lib/auth/password-hash";
import { getPasswordStrengthError } from "@/lib/auth/password-policy";

async function requireSettingsWrite() {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "settings.write");
  } catch {
    redirectSettingsError("/settings/profiles", "No autorizado: se requiere permiso de escritura en configuración.");
  }
  return user;
}

async function requireSettingsDelete() {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "settings.delete");
  } catch {
    redirectSettingsError("/settings/profiles", "No autorizado: se requiere permiso para eliminar en configuración.");
  }
  return user;
}

function refreshDataViews() {
  const paths = [
    "/dashboard",
    "/requirements",
    "/requirements/kanban",
    "/time-entries",
    "/time-entries/new",
    "/budgets",
    "/team",
    "/settings/profiles",
    "/settings/users",
    "/settings/clients",
    "/settings/requirement-statuses",
    "/settings/priorities",
    "/settings/time-categories",
    "/settings/budget-scopes",
    "/settings/exchange-rates",
    "/reports",
    "/notifications",
  ];
  paths.forEach((path) => revalidatePath(path));
}

const CATALOG_KIND_PATH: Record<SettingsCatalogKind, string> = {
  requirement_status: "/settings/requirement-statuses",
  requirement_priority: "/settings/priorities",
  time_entry_category: "/settings/time-categories",
  budget_scope: "/settings/budget-scopes",
};

const VALID_KINDS: SettingsCatalogKind[] = [
  "requirement_status",
  "requirement_priority",
  "time_entry_category",
  "budget_scope",
];

/** Redirige mostrando el mensaje en `SettingsFlashBanner`. */
function redirectSettingsError(returnPath: string, message: string): never {
  redirect(`${returnPath}?settingsError=${encodeURIComponent(message)}`);
}

async function findCatalogEntryById(id: string): Promise<SettingsCatalogEntry | undefined> {
  for (const kind of VALID_KINDS) {
    const list = await getCatalogByKind(kind);
    const found = list.find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}

export async function createProfileAction(formData: FormData) {
  const actor = await requireSettingsWrite();
  const name = String(formData.get("name") ?? "").trim();
  const hourlyRate = Number(formData.get("hourlyRate"));
  const rateCurrency = String(formData.get("rateCurrency") ?? "CLP").trim() || "CLP";
  const active = String(formData.get("active") ?? "true") !== "false";
  if (!name) redirectSettingsError("/settings/profiles", "Nombre requerido.");
  const created = await createProfile({ name, hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : 0, rateCurrency, active });
  await recordAuditSafely({
    entityType: "profile",
    entityId: created.id,
    action: "create",
    beforeJson: "{}",
    afterJson: JSON.stringify({ name, hourlyRate, rateCurrency, active }),
    userId: actor?.id ?? "unknown",
  });
  refreshDataViews();
}

export async function updateProfileAction(profileId: string, formData: FormData) {
  await requireSettingsWrite();
  const name = String(formData.get("name") ?? "").trim();
  const hourlyRate = Number(formData.get("hourlyRate"));
  const rateCurrency = String(formData.get("rateCurrency") ?? "CLP").trim() || "CLP";
  const active = String(formData.get("active") ?? "true") !== "false";
  if (!name) redirectSettingsError("/settings/profiles", "Nombre requerido.");
  await updateProfile(profileId, {
    name,
    hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : 0,
    rateCurrency,
    active,
  });
  refreshDataViews();
}

export async function deleteProfileAction(profileId: string, _formData?: FormData) {
  await requireSettingsDelete();
  const users = await getUsers();
  if (users.some((u) => u.profileId === profileId)) {
    redirectSettingsError(
      "/settings/profiles",
      "No se puede eliminar: hay usuarios asignados a este perfil. Reasígnelos primero en Usuarios.",
    );
  }
  await deleteProfile(profileId);
  refreshDataViews();
}

export async function createClientAction(formData: FormData) {
  await requireSettingsWrite();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const active = String(formData.get("active") ?? "true") !== "false";
  if (!name || !code) redirectSettingsError("/settings/clients", "Nombre y código requeridos.");
  await createClient({ name, code, active });
  refreshDataViews();
}

export async function updateClientAction(clientId: string, formData: FormData) {
  await requireSettingsWrite();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const active = String(formData.get("active") ?? "true") !== "false";
  if (!name || !code) redirectSettingsError("/settings/clients", "Nombre y código requeridos.");
  await updateClient(clientId, { name, code, active });
  refreshDataViews();
}

export async function deleteClientAction(clientId: string, _formData?: FormData) {
  await requireSettingsDelete();
  const requirements = await getRequirements();
  if (requirements.some((r) => r.clientId === clientId)) {
    redirectSettingsError("/settings/clients", "No se puede eliminar: existen requerimientos asociados a este cliente.");
  }
  await deleteClient(clientId);
  refreshDataViews();
}

export async function createCatalogFromFormAction(formData: FormData) {
  await requireSettingsWrite();
  const kindRaw = String(formData.get("kind") ?? "");
  if (!VALID_KINDS.includes(kindRaw as SettingsCatalogKind)) {
    redirectSettingsError("/settings/requirement-statuses", "Tipo de catálogo inválido.");
  }
  const kind = kindRaw as SettingsCatalogKind;
  const returnPath = CATALOG_KIND_PATH[kind];
  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const active = String(formData.get("active") ?? "true") !== "false";
  if (!code || !label) redirectSettingsError(returnPath, "Código y etiqueta requeridos.");
  const list = await getCatalogByKind(kind);
  if (list.some((e) => e.code === code)) {
    redirectSettingsError(returnPath, "Ya existe una entrada con ese código en este catálogo.");
  }
  const order = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : list.length;
  await createCatalogEntry({ kind, code, label, sortOrder: order, active });
  refreshDataViews();
}

export async function updateCatalogAction(id: string, formData: FormData) {
  await requireSettingsWrite();
  const existing = await findCatalogEntryById(id);
  if (!existing) {
    redirectSettingsError("/settings/requirement-statuses", "Entrada de catálogo no encontrada.");
  }
  const returnPath = CATALOG_KIND_PATH[existing.kind];
  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));
  const active = String(formData.get("active") ?? "true") !== "false";
  if (!code || !label) redirectSettingsError(returnPath, "Código y etiqueta requeridos.");
  const list = await getCatalogByKind(existing.kind);
  if (list.some((e) => e.id !== id && e.code === code)) {
    redirectSettingsError(returnPath, "Ya existe otra entrada con ese código en este catálogo.");
  }
  await updateCatalogEntry(id, {
    code,
    label,
    sortOrder: Number.isFinite(sortOrder) ? Number(sortOrder) : 0,
    active,
  });
  refreshDataViews();
}

export async function deleteCatalogAction(id: string, _formData?: FormData) {
  await requireSettingsDelete();
  const entry = await findCatalogEntryById(id);
  if (!entry) {
    redirectSettingsError("/settings/requirement-statuses", "Entrada de catálogo no encontrada.");
  }
  const returnPath = CATALOG_KIND_PATH[entry.kind];
  const [requirements, timeEntries, budgets] = await Promise.all([getRequirements(), getTimeEntries(), getBudgets()]);

  if (entry.kind === "requirement_status" && requirements.some((r) => r.status === entry.code)) {
    redirectSettingsError(returnPath, "No se puede eliminar: hay requerimientos con este estado.");
  }
  if (entry.kind === "requirement_priority" && requirements.some((r) => r.priority === entry.code)) {
    redirectSettingsError(returnPath, "No se puede eliminar: hay requerimientos con esta prioridad.");
  }
  if (entry.kind === "time_entry_category" && timeEntries.some((t) => t.category === entry.code)) {
    redirectSettingsError(returnPath, "No se puede eliminar: hay horas registradas con esta categoría.");
  }
  if (entry.kind === "budget_scope" && budgets.some((b) => b.scope === entry.code)) {
    redirectSettingsError(returnPath, "No se puede eliminar: hay presupuestos con este scope.");
  }

  await deleteCatalogEntry(id);
  refreshDataViews();
}

const roles: Role[] = ["Admin", "Project Manager", "Contributor", "Viewer"];

function parseRole(value: string): Role {
  return roles.includes(value as Role) ? (value as Role) : "Contributor";
}

type IdentityRow = {
  password_hash: string;
};

function parsePassword(formData: FormData): string {
  return String(formData.get("password") ?? "").trim();
}

function assertPasswordStrength(password: string, contextLabel: string) {
  const strengthError = getPasswordStrengthError(password);
  if (strengthError) {
    redirectSettingsError("/settings/users", `${contextLabel}: ${strengthError}`);
  }
}

async function syncAuthIdentityForUser(input: {
  userId: string;
  email: string;
  role: Role;
  displayName: string;
  active: boolean;
  password?: string;
  requirePasswordIfMissingIdentity?: boolean;
}) {
  if (getAuthProviderKind() !== "authjs") return;
  if (!isPostgresConfigured()) {
    redirectSettingsError("/settings/users", "No se pudo sincronizar credenciales: POSTGRES_URL no está configurado.");
  }

  const { rows } = await queryPg<IdentityRow>("select password_hash from rms_app_identities where user_id = $1 limit 1", [input.userId]);
  const existingPasswordHash = rows[0]?.password_hash ?? "";
  const hasIdentity = Boolean(existingPasswordHash);
  const plainPassword = (input.password ?? "").trim();

  if (!hasIdentity && !plainPassword) {
    if (input.requirePasswordIfMissingIdentity) {
      redirectSettingsError(
        "/settings/users",
        "Para habilitar acceso de este usuario, define una contraseña de al menos 8 caracteres.",
      );
    }
  } else {
    const passwordHash = plainPassword ? hashPassword(plainPassword) : existingPasswordHash;
    const now = new Date().toISOString();
    await queryPg(
      `insert into rms_app_identities (user_id, email, password_hash, active, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id) do update
       set email = excluded.email,
           password_hash = excluded.password_hash,
           active = excluded.active,
           updated_at = excluded.updated_at`,
      [input.userId, input.email, passwordHash, input.active, now, now],
    );
  }

  await queryPg(
    `insert into rms_auth_profile (user_id, role, display_name)
     values ($1, $2, $3)
     on conflict (user_id) do update
     set role = excluded.role,
         display_name = excluded.display_name`,
    [input.userId, input.role, input.displayName],
  );
}

async function deleteAuthIdentityForUser(userId: string) {
  if (getAuthProviderKind() !== "authjs") return;
  if (!isPostgresConfigured()) return;
  await queryPg("delete from rms_app_identities where user_id = $1", [userId]);
  await queryPg("delete from rms_auth_profile where user_id = $1", [userId]);
}

export async function createUserAction(formData: FormData) {
  await requireSettingsWrite();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const role = parseRole(String(formData.get("role") ?? "Contributor"));
  const aliasesRaw = String(formData.get("aliases") ?? "").trim();
  const aliases = aliasesRaw
    ? aliasesRaw
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];
  const active = formData.get("active") !== "false";
  const password = parsePassword(formData);
  if (!name || !email || !profileId) {
    redirectSettingsError("/settings/users", "Nombre, email y perfil requeridos.");
  }
  if (getAuthProviderKind() === "authjs") {
    assertPasswordStrength(password, "No se pudo crear usuario");
  }
  const created = await createUser({ name, email, aliases, profileId, active, role });
  await syncAuthIdentityForUser({
    userId: created.id,
    email,
    role,
    displayName: name,
    active,
    password,
    requirePasswordIfMissingIdentity: true,
  });
  refreshDataViews();
}

export async function updateUserAction(userId: string, formData: FormData) {
  await requireSettingsWrite();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const profileId = String(formData.get("profileId") ?? "").trim();
  const role = parseRole(String(formData.get("role") ?? "Contributor"));
  const aliasesRaw = String(formData.get("aliases") ?? "").trim();
  const aliases = aliasesRaw
    ? aliasesRaw
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];
  const active = formData.get("active") !== "false";
  const password = parsePassword(formData);
  if (!name || !email || !profileId) {
    redirectSettingsError("/settings/users", "Nombre, email y perfil requeridos.");
  }
  if (password) {
    assertPasswordStrength(password, "No se pudo actualizar usuario");
  }
  const updated = await updateUser(userId, { name, email, aliases, profileId, active, role });
  if (!updated) {
    redirectSettingsError("/settings/users", "No se encontró el usuario para actualizar.");
  }
  await syncAuthIdentityForUser({
    userId,
    email,
    role,
    displayName: name,
    active,
    password,
    requirePasswordIfMissingIdentity: false,
  });
  refreshDataViews();
}

export async function deleteUserAction(userId: string, _formData?: FormData) {
  await requireSettingsDelete();
  const requirements = await getRequirements();
  if (requirements.some((r) => r.ownerId === userId)) {
    redirectSettingsError("/settings/users", "No se puede eliminar: el usuario tiene requerimientos asignados.");
  }
  await deleteUser(userId);
  await deleteAuthIdentityForUser(userId);
  refreshDataViews();
}

export async function updateFinancialReferenceRatesAction(formData: FormData) {
  await requireSettingsWrite();
  const ufRaw = String(formData.get("ufToClp") ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const usdRaw = String(formData.get("usdToClp") ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const uf = Number(ufRaw);
  const usd = Number(usdRaw);
  if (!Number.isFinite(uf) || uf < 0) {
    redirectSettingsError("/settings/exchange-rates", "Valor de UF en CLP inválido: use un número mayor o igual a 0.");
  }
  if (!Number.isFinite(usd) || usd < 0) {
    redirectSettingsError("/settings/exchange-rates", "Valor del dólar en CLP inválido: use un número mayor o igual a 0.");
  }
  await updateFinancialReferenceRates({ ufToClp: uf, usdToClp: usd });
  refreshDataViews();
}

export async function getPortalTokenAction(clientId: string): Promise<string> {
  await requireSettingsWrite();
  const { signPortalToken } = await import("@/lib/portal/token");
  return signPortalToken(clientId);
}
