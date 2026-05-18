import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { isPostgresConfigured } from "@/lib/postgres/env";

let poolSingleton: Pool | null = null;

function normalizePostgresConnectionString(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const sslMode = (url.searchParams.get("sslmode") || "").trim().toLowerCase();
    const useLibpqCompat = (url.searchParams.get("uselibpqcompat") || "").trim().toLowerCase() === "true";

    // pg v8 advierte por alias legacy (`require`, `prefer`, `verify-ca`); hoy se tratan como verify-full.
    // Forzamos `verify-full` para mantener ese comportamiento y evitar warnings en runtime.
    if (!useLibpqCompat && (sslMode === "require" || sslMode === "prefer" || sslMode === "verify-ca")) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export function getPostgresPool(): Pool | null {
  if (!isPostgresConfigured()) return null;
  if (!poolSingleton) {
    const connectionString = normalizePostgresConnectionString(process.env.POSTGRES_URL ?? "");
    poolSingleton = new Pool({
      connectionString,
      max: Number(process.env.POSTGRES_POOL_MAX ?? "10"),
      idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? "30000"),
      statement_timeout: Number(process.env.POSTGRES_STATEMENT_TIMEOUT_MS ?? "15000"),
      ssl: process.env.POSTGRES_SSL_MODE === "disable" ? undefined : { rejectUnauthorized: false },
    });
  }
  return poolSingleton;
}

export async function withPostgresClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error("POSTGRES_URL no configurado.");
  }
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function queryPg<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error("POSTGRES_URL no configurado.");
  }
  return pool.query<T>(text, [...values]);
}
