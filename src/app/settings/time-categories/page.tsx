import { SettingsCatalogPanel } from "@/components/settings/settings-catalog-panel";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { getCatalogByKind } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsTimeCategoriesPage() {
  const sessionUser = await requirePermission("settings.read");
  const canWrite = roleHasPermission(sessionUser.role, "settings.write");
  const rows = await getCatalogByKind("time_entry_category");
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"));

  return (
    <>
      <SettingsPageIntro
        eyebrow="Catálogo"
        title="Categorías de horas"
        description="Tabla de categorías de horas con CRUD completo. La eliminación falla si existen horas con ese código."
      />
      <SettingsCatalogPanel
        kind="time_entry_category"
        title="Catálogo de categorías"
        description="Alinea códigos con finanzas o el ERP al exportar."
        rows={sorted}
        canWrite={canWrite}
      />
    </>
  );
}
