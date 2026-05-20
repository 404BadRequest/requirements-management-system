import type { AppSessionUser } from "@/lib/auth/session";
import type { User } from "@/types/domain";

/**
 * El usuario de sesión puede ser UUID de Auth o un id mock; los comentarios y auditoría usan `rms_directory_users.id`.
 * Resuelve por email, por id directo o, en último caso, un admin activo.
 */
export function resolveDirectoryUserIdForSession(sessionUser: AppSessionUser, users: User[]): string {
  const active = users.filter((u) => u.active);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim()
      .toLowerCase();
  const sessionEmail = sessionUser.email?.trim().toLowerCase() ?? "";
  const sessionName = sessionUser.name?.trim() ?? "";

  if (sessionEmail) {
    const byEmail = active.find((u) => u.email.toLowerCase() === sessionEmail);
    if (byEmail) return byEmail.id;
  }
  if (active.some((u) => u.id === sessionUser.id)) return sessionUser.id;
  if (sessionName) {
    const normalizedName = normalize(sessionName);
    const byName = active.find((u) => normalize(u.name) === normalizedName);
    if (byName) return byName.id;
    const byAlias = active.find((u) => u.aliases.some((alias) => normalize(alias) === normalizedName));
    if (byAlias) return byAlias.id;
  }
  if (sessionEmail) {
    const localPart = sessionEmail.split("@")[0] ?? "";
    if (localPart) {
      const byAliasFromEmail = active.find((u) => u.aliases.some((alias) => normalize(alias) === normalize(localPart)));
      if (byAliasFromEmail) return byAliasFromEmail.id;
    }
  }
  return sessionUser.id;
}
