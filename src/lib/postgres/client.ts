import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { isPostgresConfigured } from "@/lib/postgres/env";

let poolSingleton: Pool | null = null;

export function getPostgresPool(): Pool | null {
  if (!isPostgresConfigured()) return null;
  if (!poolSingleton) {
    poolSingleton = new Pool({
      connectionString: process.env.POSTGRES_URL,
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
