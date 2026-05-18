export type DataProviderKind = "mock" | "supabase" | "postgres";
export type AuthProviderKind = "supabase" | "authjs";

export function getDataProviderKind(): DataProviderKind {
  const explicit = process.env.DATA_PROVIDER?.trim().toLowerCase();
  if (explicit === "mock" || explicit === "supabase" || explicit === "postgres") {
    return explicit;
  }
  if (process.env.USE_SUPABASE_DATA === "true") {
    return "supabase";
  }
  return "postgres";
}

export function getAuthProviderKind(): AuthProviderKind {
  const explicit = process.env.AUTH_PROVIDER?.trim().toLowerCase();
  if (explicit === "supabase" || explicit === "authjs") {
    return explicit;
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return "supabase";
  }
  return "authjs";
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim());
}
