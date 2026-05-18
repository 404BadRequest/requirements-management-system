import "server-only";

import { MockDataProvider } from "@/data/adapters/mock/mock-data-provider";
import { PostgresDataProvider } from "@/data/adapters/postgres/postgres-data-provider";
import { SupabaseDataProvider } from "@/data/adapters/supabase/supabase-data-provider";
import type { AppDataProvider } from "@/data/repositories/app-data-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDataProviderKind, isPostgresConfigured } from "@/lib/postgres/env";

const mockProvider = new MockDataProvider();

export async function getServerDataProvider(): Promise<AppDataProvider> {
  const providerKind = getDataProviderKind();

  if (providerKind === "postgres") {
    if (!isPostgresConfigured()) {
      return mockProvider;
    }
    return new PostgresDataProvider();
  }

  if (providerKind === "supabase") {
    const sb = await createSupabaseServerClient();
    if (!sb) {
      return mockProvider;
    }
    return new SupabaseDataProvider(sb);
  }

  return mockProvider;
}
