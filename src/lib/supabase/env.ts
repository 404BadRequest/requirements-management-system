import { getAuthProviderKind, getDataProviderKind } from "@/lib/postgres/env";

/** Supabase URL + anon key configured (client and middleware can run). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

/** Persist data in Supabase instead of in-memory mocks (server-only reads/writes). */
export function isSupabasePersistenceEnabled(): boolean {
  return getDataProviderKind() === "supabase" && isSupabaseConfigured();
}

/**
 * When true and Supabase is configured, middleware enforces login.
 * Set NEXT_PUBLIC_AUTH_ENABLED=false for local E2E without auth (default in playwright).
 */
export function isAuthMiddlewareEnabled(): boolean {
  if (getAuthProviderKind() !== "supabase") {
    return process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";
  }
  if (!isSupabaseConfigured()) return false;
  return process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";
}
