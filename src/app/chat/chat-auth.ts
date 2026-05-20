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
  return { sessionUser: user, meUserId, users };
}
