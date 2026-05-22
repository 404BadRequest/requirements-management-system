import { SettingsClientsPanel } from "@/components/settings/settings-clients-panel";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { getClients } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsClientsPage() {
  const sessionUser = await requirePermission("settings.read");
  const canWrite = roleHasPermission(sessionUser.role, "settings.write");
  const clients = await getClients();

  return (
    <>
      <SettingsPageIntro
        eyebrow="Equipo y datos"
        title="Clientes"
        description="Directorio en tabla con acciones de alta (modal), edición y baja. Los clientes se usan en requerimientos y reportes."
      />
      <SettingsClientsPanel clients={clients} canWrite={canWrite} />
    </>
  );
}
