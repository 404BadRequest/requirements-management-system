import type { Profile, User } from "@/types/domain";
import type { AppSessionUser } from "@/lib/auth/session";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";

const ADMIN_PROFILE_IDS = new Set(["prof-admin", "profile-admin"]);

/** Perfil reservado para cuentas administrativas; no participa en horas ni presupuestos operativos. */
export function isAdministrativeProfile(profile: Pick<Profile, "id" | "name">): boolean {
  if (ADMIN_PROFILE_IDS.has(profile.id)) return true;
  return profile.name.trim().toLowerCase() === "administrador";
}

export function filterOperationalProfiles<T extends Pick<Profile, "id" | "name">>(profiles: T[]): T[] {
  return profiles.filter((profile) => !isAdministrativeProfile(profile));
}

export function isAdministrativeUser(
  user: Pick<User, "role" | "profileId">,
  profileById?: Map<string, Pick<Profile, "id" | "name">>,
): boolean {
  if (user.role === "Admin") return true;
  const profile = profileById?.get(user.profileId);
  return profile ? isAdministrativeProfile(profile) : false;
}

export function filterOperationalUsers<T extends Pick<User, "role" | "profileId">>(
  users: T[],
  profiles?: Pick<Profile, "id" | "name">[],
): T[] {
  const profileById = profiles ? new Map(profiles.map((profile) => [profile.id, profile])) : undefined;
  return users.filter((user) => !isAdministrativeUser(user, profileById));
}

export function filterOperationalTimeEntries<T extends { userId: string }>(
  entries: T[],
  users: Pick<User, "id" | "role" | "profileId">[],
  profiles?: Pick<Profile, "id" | "name">[],
): T[] {
  const allowedUserIds = new Set(filterOperationalUsers(users, profiles).map((user) => user.id));
  return entries.filter((entry) => allowedUserIds.has(entry.userId));
}

export function assertOperationalProfileIds(profileIds: string[], profiles: Pick<Profile, "id" | "name">[]): void {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  for (const profileId of profileIds) {
    const profile = profileById.get(profileId);
    if (profile && isAdministrativeProfile(profile)) {
      throw new Error("El perfil Administrador no puede usarse en flujos operativos.");
    }
  }
}

export function assertOperationalUserId(
  userId: string,
  users: Pick<User, "id" | "role" | "profileId">[],
  profiles?: Pick<Profile, "id" | "name">[],
): void {
  const profileById = profiles ? new Map(profiles.map((profile) => [profile.id, profile])) : undefined;
  const user = users.find((entry) => entry.id === userId);
  if (user && isAdministrativeUser(user, profileById)) {
    throw new Error("El usuario administrador no puede usarse en flujos operativos.");
  }
}

/** Resuelve el id de directorio para acciones operativas; evita asignar al admin cuando no participa en el pool. */
export function resolveOperationalActorUserId(sessionUser: AppSessionUser, operationalUsers: User[]): string {
  const resolved = resolveDirectoryUserIdForSession(sessionUser, operationalUsers);
  const direct = operationalUsers.find((user) => user.active && user.id === resolved);
  if (direct) return direct.id;
  const projectManager = operationalUsers.find((user) => user.active && user.role === "Project Manager");
  if (projectManager) return projectManager.id;
  const firstActive = operationalUsers.find((user) => user.active);
  if (firstActive) return firstActive.id;
  return resolved;
}
