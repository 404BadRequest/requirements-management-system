import { getUsers } from "@/data/repositories/server-db";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { getAppSession } from "@/lib/auth/session";

export async function requireChatSession(permission: "chat.read" | "chat.write") {
  const { user } = await getAppSession();
  assertPermission(user?.role, permission);
  if (!user) throw new Error("Debes iniciar sesión.");
  const users = (await getUsers()).filter((row) => row.active);
  const meUserId = resolveDirectoryUserIdForSession(user, users);
  if (!users.some((row) => row.id === meUserId)) {
    throw new Error("No pudimos vincular tu sesión al directorio interno. Contacta al administrador.");
  }
  return { sessionUser: user, meUserId, users };
}
