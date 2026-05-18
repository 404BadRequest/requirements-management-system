import type { SettingsCatalogEntry, SettingsCatalogKind } from "@/types/domain";

export type CatalogCreateInput = Omit<SettingsCatalogEntry, "id" | "createdAt" | "updatedAt">;
export type CatalogUpdateInput = Partial<Pick<SettingsCatalogEntry, "code" | "label" | "sortOrder" | "active">>;

export interface SettingsCatalogRepository {
  getByKind(kind: SettingsCatalogKind): Promise<SettingsCatalogEntry[]>;
  create(input: CatalogCreateInput): Promise<SettingsCatalogEntry>;
  update(id: string, input: CatalogUpdateInput): Promise<SettingsCatalogEntry | undefined>;
  delete(id: string): Promise<boolean>;
}
