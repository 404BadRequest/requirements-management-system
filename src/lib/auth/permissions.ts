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
  | "exports.run"
  | "notifications.read";

const matrix: Record<Role, Permission[]> = {
  Admin: [
    "dashboard.read",
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
  ],
  "Project Manager": [
    "dashboard.read",
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
  ],
  Viewer: [
    "dashboard.read",
    "requirements.read",
    "time_entries.read",
    "budgets.read",
    "team.read",
    "notifications.read",
    "exports.run",
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
