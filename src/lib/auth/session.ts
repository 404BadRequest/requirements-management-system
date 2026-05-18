import type { Role } from "@/types/domain";
import { auth } from "@/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthProviderKind } from "@/lib/postgres/env";
import { isAuthMiddlewareEnabled, isSupabaseConfigured } from "@/lib/supabase/env";

export type AppSessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AppSession = {
  user: AppSessionUser | null;
  /** true when using Supabase auth; false in pure mock local mode */
  authenticated: boolean;
};

export async function getAppSession(): Promise<AppSession> {
  if (getAuthProviderKind() === "authjs") {
    const session = await auth();
    if (!session?.user) {
      return {
        authenticated: isAuthMiddlewareEnabled(),
        user: null,
      };
    }
    const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string | null };
    return {
      authenticated: true,
      user: {
        id: user.id || "authjs-user",
        email: user.email ?? "",
        name: user.name?.trim() || user.email || "Usuario",
        role: normalizeRole(user.role),
      },
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      authenticated: false,
      user: {
        id: "local-dev",
        email: "dev@local",
        name: "Modo local",
        role: parseDevRole(process.env.DEV_APP_ROLE),
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { authenticated: false, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    if (!isAuthMiddlewareEnabled()) {
      return {
        authenticated: true,
        user: {
          id: "dev-no-auth",
          email: "dev@local",
          name: "Desarrollo (auth desactivada)",
          role: parseDevRole(process.env.DEV_APP_ROLE),
        },
      };
    }
    return { authenticated: true, user: null };
  }

  const { data: row } = await supabase.from("rms_auth_profile").select("role, display_name").eq("user_id", user.id).maybeSingle();

  const role = row ? normalizeRole(row.role) : "Viewer";
  const name = (row?.display_name as string | undefined)?.trim() || user.user_metadata?.full_name || user.email || "Usuario";

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? "",
      name,
      role,
    },
  };
}

function parseDevRole(value: string | undefined): Role {
  if (!value?.trim()) return "Admin";
  return normalizeRole(value);
}

function normalizeRole(value: string | undefined | null): Role {
  const allowed: Role[] = ["Admin", "Project Manager", "Contributor", "Viewer"];
  if (value && allowed.includes(value as Role)) return value as Role;
  return "Viewer";
}
