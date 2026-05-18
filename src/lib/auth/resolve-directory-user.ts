import type { AppSessionUser } from "@/lib/auth/session";
import type { User } from "@/types/domain";

/**
 * El usuario de sesión puede ser UUID de Auth o un id mock; los comentarios y auditoría usan `rms_directory_users.id`.
 * Resuelve por email, por id directo o, en último caso, un admin activo.
 */
export function resolveDirectoryUserIdForSession(sessionUser: AppSessionUser, users: User[]): string {
  const active = users.filter((u) => u.active);
  const byEmail = active.find((u) => u.email.toLowerCase() === sessionUser.email.toLowerCase());
  if (byEmail) return byEmail.id;
  if (active.some((u) => u.id === sessionUser.id)) return sessionUser.id;
  const admin = active.find((u) => u.role === "Admin");
  return admin?.id ?? active[0]?.id ?? sessionUser.id;
}
