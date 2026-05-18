import type { AuditLog } from "@/types/domain";

export const auditLogMemory: AuditLog[] = [];

export function pushAuditMemory(entry: Omit<AuditLog, "id" | "createdAt">): void {
  const now = new Date().toISOString();
  auditLogMemory.unshift({
    id: `audit-${crypto.randomUUID().slice(0, 12)}`,
    ...entry,
    createdAt: now,
  });
}
