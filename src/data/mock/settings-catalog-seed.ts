import type { SettingsCatalogEntry } from "@/types/domain";
import { seedNow } from "@/data/mock/seed/timestamps";

const row = (
  id: string,
  kind: SettingsCatalogEntry["kind"],
  code: string,
  label: string,
  sortOrder: number,
): SettingsCatalogEntry => ({
  id,
  kind,
  code,
  label,
  sortOrder,
  active: true,
  createdAt: seedNow,
  updatedAt: seedNow,
});

export const settingsCatalogSeed: SettingsCatalogEntry[] = [
  row("cat-st-backlog", "requirement_status", "BACKLOG", "Por desarrollar", 0),
  row("cat-st-qa", "requirement_status", "READY_FOR_QA", "Pasar a QA", 1),
  row("cat-st-qadone", "requirement_status", "QA_DONE", "Listo en QA", 2),
  row("cat-st-prod", "requirement_status", "READY_FOR_PROD", "Pasar a producción", 3),
  row("cat-st-done", "requirement_status", "DONE_PROD", "Listo en producción", 4),
  row("cat-st-wont", "requirement_status", "WONT_DO", "No desarrollar", 5),
  row("cat-st-client", "requirement_status", "CLIENT_VALIDATION", "Validar con cliente", 6),
  row("cat-pr-p0", "requirement_priority", "P0", "P0", 0),
  row("cat-pr-p1", "requirement_priority", "P1", "P1", 1),
  row("cat-pr-p2", "requirement_priority", "P2", "P2", 2),
  row("cat-pr-p3", "requirement_priority", "P3", "P3", 3),
  row("cat-pr-p4", "requirement_priority", "P4", "P4", 4),
  row("cat-pr-p5", "requirement_priority", "P5", "P5", 5),
  row("cat-pr-p6", "requirement_priority", "P6", "P6", 6),
  row("cat-te-proy", "time_entry_category", "Proyecto", "Proyecto", 0),
  row("cat-te-carga", "time_entry_category", "Carga", "Carga", 1),
  row("cat-te-op", "time_entry_category", "Operación", "Operación", 2),
  row("cat-te-err", "time_entry_category", "Error", "Error", 3),
  row("cat-te-gest", "time_entry_category", "Gestión del servicio", "Gestión del servicio", 4),
  row("cat-bs-proy", "budget_scope", "Proyecto", "Proyecto", 0),
  row("cat-bs-op", "budget_scope", "Operación", "Operación", 1),
  row("cat-bs-wa", "budget_scope", "Mantenedores / WhatsApp", "Mantenedores / WhatsApp", 2),
];

export const requirementStatusCodes = settingsCatalogSeed
  .filter((e) => e.kind === "requirement_status")
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map((e) => e.code);

export const requirementPriorityCodes = settingsCatalogSeed
  .filter((e) => e.kind === "requirement_priority")
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map((e) => e.code);

export const timeEntryCategoryCodes = settingsCatalogSeed
  .filter((e) => e.kind === "time_entry_category")
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map((e) => e.code);

export const budgetScopeCodes = settingsCatalogSeed
  .filter((e) => e.kind === "budget_scope")
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map((e) => e.code);
