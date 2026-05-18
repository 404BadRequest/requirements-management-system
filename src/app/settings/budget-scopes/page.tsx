import { SettingsCatalogPanel } from "@/components/settings/settings-catalog-panel";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { getCatalogByKind } from "@/data/repositories/server-db";

export default async function SettingsBudgetScopesPage() {
  const rows = await getCatalogByKind("budget_scope");
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"));

  return (
    <>
      <SettingsPageIntro
        eyebrow="Catálogo"
        title="Scopes de presupuesto"
        description="Ámbitos de costeo en tabla; crear, editar y eliminar desde modales. No podrás borrar un scope usado en presupuestos."
      />
      <SettingsCatalogPanel
        kind="budget_scope"
        title="Catálogo de scopes"
        description="Ej.: proyecto, operación, soporte — según tu modelo de negocio."
        rows={sorted}
      />
    </>
  );
}
