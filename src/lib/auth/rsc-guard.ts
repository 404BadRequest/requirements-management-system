import "server-only";

import { redirect } from "next/navigation";
import { getAppSession, type AppSessionUser } from "@/lib/auth/session";
import { assertPermission, type Permission } from "@/lib/auth/permissions";

/** Garantiza sesión con usuario y permiso; redirige si falta identidad o permiso. */
export async function requirePermission(permission: Permission): Promise<AppSessionUser> {
  const { user } = await getAppSession();
  if (!user) {
    redirect("/login");
  }
  try {
    assertPermission(user.role, permission);
  } catch {
    redirect("/dashboard");
  }
  return user;
}
