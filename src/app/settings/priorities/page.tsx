import { SettingsCatalogPanel } from "@/components/settings/settings-catalog-panel";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { getCatalogByKind } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsPrioritiesPage() {
  const sessionUser = await requirePermission("settings.read");
  const canWrite = roleHasPermission(sessionUser.role, "settings.write");
  const rows = await getCatalogByKind("requirement_priority");
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"));

  return (
    <>
      <SettingsPageIntro
        eyebrow="Catálogo"
        title="Prioridades"
        description="Gestión tabular de prioridades con creación, edición y eliminación protegida si hay requerimientos en uso."
      />
      <SettingsCatalogPanel
        kind="requirement_priority"
        title="Catálogo de prioridades"
        description="Mantén códigos únicos por catálogo para informes comparables."
        rows={sorted}
        canWrite={canWrite}
      />
    </>
  );
}
