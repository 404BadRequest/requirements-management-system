// TODO: tabla unificada p.ej. `settings_catalog_entries`: id, kind (requirement_status | requirement_priority | time_entry_category | budget_scope),
// code (único por kind), label, sort_order, active, created_at, updated_at.
// Índices: (kind, code) único. Métodos según SettingsCatalogRepository: getByKind, create, update, delete.

export class SupabaseSettingsCatalogRepository {}
