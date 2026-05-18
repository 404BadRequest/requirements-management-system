"use server";

import { getAppSession } from "@/lib/auth/session";
import { changeAuthJsPasswordForUser } from "@/lib/auth/change-auth-password";
import type { ChangePasswordInput } from "@/schemas/change-password-schema";

export async function changePasswordAction(input: ChangePasswordInput) {
  const { user } = await getAppSession();
  if (!user) {
    throw new Error("Debes iniciar sesión.");
  }

  await changeAuthJsPasswordForUser({
    userId: user.id,
    email: user.email,
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  });
}
