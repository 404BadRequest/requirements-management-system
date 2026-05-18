import "server-only";

import { queryPg } from "@/lib/postgres/client";
import { getAuthProviderKind, isPostgresConfigured } from "@/lib/postgres/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password-hash";
import { getPasswordStrengthError } from "@/lib/auth/password-policy";

type IdentityRow = {
  user_id: string;
  email: string;
  password_hash: string;
  active: boolean;
};

async function findIdentityForUser(userId: string, email: string): Promise<IdentityRow | null> {
  const byId = await queryPg<IdentityRow>(
    `select user_id, email, password_hash, active
       from rms_app_identities
      where user_id = $1
      limit 1`,
    [userId],
  );
  if (byId.rows[0]) return byId.rows[0];

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const byEmail = await queryPg<IdentityRow>(
    `select user_id, email, password_hash, active
       from rms_app_identities
      where lower(email) = $1
      limit 1`,
    [normalizedEmail],
  );
  return byEmail.rows[0] ?? null;
}

export async function changeAuthJsPasswordForUser(input: {
  userId: string;
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  if (getAuthProviderKind() !== "authjs") {
    throw new Error("El cambio de contraseña no está disponible con el proveedor de acceso actual.");
  }
  if (!isPostgresConfigured()) {
    throw new Error("No se pudo actualizar la contraseña: la base de datos no está configurada.");
  }

  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword.trim();
  if (!currentPassword) {
    throw new Error("Ingresa tu contraseña actual.");
  }

  const strengthError = getPasswordStrengthError(newPassword);
  if (strengthError) {
    throw new Error(strengthError);
  }

  const identity = await findIdentityForUser(input.userId, input.email);
  if (!identity || !identity.active || !identity.password_hash?.trim()) {
    throw new Error("Tu cuenta no tiene credenciales configuradas. Pide a un administrador que habilite tu acceso.");
  }
  if (!verifyPassword(currentPassword, identity.password_hash)) {
    throw new Error("La contraseña actual no es correcta.");
  }
  if (verifyPassword(newPassword, identity.password_hash)) {
    throw new Error("La nueva contraseña debe ser distinta a la actual.");
  }

  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();
  await queryPg(
    `update rms_app_identities
        set password_hash = $2,
            updated_at = $3
      where user_id = $1`,
    [identity.user_id, passwordHash, now],
  );
}
