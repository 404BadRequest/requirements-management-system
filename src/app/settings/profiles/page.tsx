import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { SettingsProfilesPanel } from "@/components/settings/settings-profiles-panel";
import { getProfiles, getUsers } from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsProfilesPage() {
  const sessionUser = await requirePermission("settings.read");
  const canWrite = roleHasPermission(sessionUser.role, "settings.write");
  const [profiles, users] = await Promise.all([getProfiles(), getUsers()]);
  const sorted = [...profiles].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const rows = sorted.map((p) => ({
    ...p,
    linkedCount: users.filter((u) => u.profileId === p.id).length,
  }));

  return (
    <>
      <SettingsPageIntro
        eyebrow="Equipo y datos"
        title="Perfiles y tarifas"
        description="Tabla de perfiles con tarifa y usuarios vinculados. Crear y editar abre un formulario modal; eliminar solo si no hay usuarios asignados."
      />
      <SettingsProfilesPanel profiles={rows} canWrite={canWrite} />
    </>
  );
}
