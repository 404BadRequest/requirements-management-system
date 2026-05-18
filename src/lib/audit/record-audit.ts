import "server-only";

import { getServerDataProvider } from "@/data/repositories/server-provider";
import { pushAuditMemory } from "@/lib/audit/memory";

export async function recordAuditSafely(entry: {
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: string;
  afterJson: string;
  userId: string;
}): Promise<void> {
  try {
    const provider = await getServerDataProvider();
    await provider.appendAudit(entry);
  } catch {
    pushAuditMemory(entry);
  }
}
