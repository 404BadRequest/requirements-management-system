import type { Role } from "@/types/domain";

export type Permission =
  | "requirements.read"
  | "requirements.write"
  | "requirements.delete"
  | "time_entries.read"
  | "time_entries.write"
  | "time_entries.delete"
  | "budgets.read"
  | "budgets.write"
  | "budgets.delete"
  | "team.read"
  | "settings.read"
  | "settings.write"
  | "settings.delete"
  | "dashboard.read"
  | "reports.read"
  | "exports.run"
  | "notifications.read"
  | "chat.read"
  | "chat.write";

const matrix: Record<Role, Permission[]> = {
  Admin: [
    "dashboard.read",
    "reports.read",
    "requirements.read",
    "requirements.write",
    "requirements.delete",
    "time_entries.read",
    "time_entries.write",
    "time_entries.delete",
    "budgets.read",
    "budgets.write",
    "budgets.delete",
    "team.read",
    "settings.read",
    "settings.write",
    "settings.delete",
    "exports.run",
    "notifications.read",
    "chat.read",
    "chat.write",
  ],
  "Project Manager": [
    "dashboard.read",
    "reports.read",
    "requirements.read",
    "requirements.write",
    "requirements.delete",
    "time_entries.read",
    "time_entries.write",
    "time_entries.delete",
    "budgets.read",
    "budgets.write",
    "budgets.delete",
    "team.read",
    "settings.read",
    "settings.write",
    "settings.delete",
    "exports.run",
    "notifications.read",
    "chat.read",
    "chat.write",
  ],
  Contributor: [
    "dashboard.read",
    "requirements.read",
    "requirements.write",
    "time_entries.read",
    "time_entries.write",
    "team.read",
    "notifications.read",
    "exports.run",
    "chat.read",
    "chat.write",
  ],
  Viewer: [
    "dashboard.read",
    "requirements.read",
    "time_entries.read",
    "budgets.read",
    "team.read",
    "notifications.read",
    "exports.run",
    "chat.read",
    "chat.write",
  ],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return matrix[role]?.includes(permission) ?? false;
}

export function assertPermission(role: Role | undefined, permission: Permission): void {
  if (!role || !roleHasPermission(role, permission)) {
    throw new Error("No autorizado para esta operación.");
  }
}
