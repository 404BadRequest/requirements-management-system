import "server-only";

import type { Role } from "@/types/domain";
import { queryPg } from "@/lib/postgres/client";
import { isPostgresConfigured } from "@/lib/postgres/env";
import { verifyPassword } from "@/lib/auth/password-hash";

type IdentityRow = {
  user_id: string;
  email: string;
  password_hash: string;
  active: boolean;
  display_name: string | null;
  role: string | null;
};

export type AuthIdentity = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

function normalizeRole(value: string | null | undefined): Role {
  const allowed: Role[] = ["Admin", "Project Manager", "Contributor", "Viewer"];
  if (value && allowed.includes(value as Role)) return value as Role;
  return "Viewer";
}

export async function authenticateAuthJsCredentials(email: string, password: string): Promise<AuthIdentity | null> {
  if (!isPostgresConfigured()) return null;
  const { rows } = await queryPg<IdentityRow>(
    `select i.user_id, i.email, i.password_hash, i.active,
            coalesce(p.display_name, u.name) as display_name,
            coalesce(p.role, u.role, 'Viewer') as role
       from rms_app_identities i
       left join rms_auth_profile p on p.user_id = i.user_id
       left join rms_directory_users u on u.id = i.user_id
      where lower(i.email) = lower($1)
      limit 1`,
    [email],
  );
  const row = rows[0];
  if (!row || !row.active) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name?.trim() || row.email,
    role: normalizeRole(row.role),
  };
}
