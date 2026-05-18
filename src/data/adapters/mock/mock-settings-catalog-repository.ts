import type {
  CatalogCreateInput,
  CatalogUpdateInput,
  SettingsCatalogRepository,
} from "@/data/contracts/settings-catalog-contract";
import { settingsCatalogSeed } from "@/data/mock/settings-catalog-seed";
import type { SettingsCatalogEntry, SettingsCatalogKind } from "@/types/domain";

const db: SettingsCatalogEntry[] = settingsCatalogSeed.map((e) => ({ ...e }));

export class MockSettingsCatalogRepository implements SettingsCatalogRepository {
  async getByKind(kind: SettingsCatalogKind): Promise<SettingsCatalogEntry[]> {
    return db
      .filter((e) => e.kind === kind)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"));
  }

  async create(input: CatalogCreateInput): Promise<SettingsCatalogEntry> {
    const now = new Date().toISOString();
    const prefix =
      input.kind === "requirement_status"
        ? "cat-st"
        : input.kind === "requirement_priority"
          ? "cat-pr"
          : input.kind === "time_entry_category"
            ? "cat-te"
            : "cat-bs";
    const created: SettingsCatalogEntry = {
      id: `${prefix}-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async update(id: string, input: CatalogUpdateInput): Promise<SettingsCatalogEntry | undefined> {
    const index = db.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    const next: SettingsCatalogEntry = { ...db[index], ...input, updatedAt: new Date().toISOString() };
    db[index] = next;
    return next;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((e) => e.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
