import "server-only";

/** Log estructurado sin PII; usar en Server Actions para trazabilidad operativa. */
export function logServerActionEvent(payload: {
  action: string;
  entityType?: string;
  entityId?: string;
  outcome: "ok" | "error";
  detail?: string;
}): void {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    scope: "server_action",
    ...payload,
  });
  if (payload.outcome === "error") {
    console.error(line);
  } else {
    console.info(line);
  }
}
