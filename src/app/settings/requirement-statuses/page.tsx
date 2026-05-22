import { SettingsCatalogPanel } from "@/components/settings/settings-catalog-panel";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { getCatalogByKind } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsRequirementStatusesPage() {
  const sessionUser = await requirePermission("settings.read");
  const canWrite = roleHasPermission(sessionUser.role, "settings.write");
  const rows = await getCatalogByKind("requirement_status");
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"));

  return (
    <>
      <SettingsPageIntro
        eyebrow="Catálogo"
        title="Estados de requerimiento"
        description="Tabla del catálogo con código estable y etiqueta visible. Todas las operaciones CRUD en modales."
      />
      <SettingsCatalogPanel
        kind="requirement_status"
        title="Catálogo de estados"
        description="Ordena según tu flujo. Las entradas inactivas pueden ocultarse en otros procesos si lo implementas más adelante."
        rows={sorted}
        canWrite={canWrite}
      />
    </>
  );
}
