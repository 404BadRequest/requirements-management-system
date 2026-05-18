import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { SettingsUsersPanel } from "@/components/settings/settings-users-panel";
import { getProfiles, getUsers } from "@/data/repositories/server-db";

export default async function SettingsUsersPage() {
  const [users, profiles] = await Promise.all([getUsers(), getProfiles()]);
  const sortedProfiles = [...profiles].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <>
      <SettingsPageIntro
        eyebrow="Equipo y datos"
        title="Usuarios"
        description="Gestión tabular del equipo: crear, editar y eliminar desde una sola vista. Las altas y ediciones se hacen en ventanas modales."
      />
      <SettingsUsersPanel users={sortedUsers} profiles={sortedProfiles.map((p) => ({ id: p.id, name: p.name }))} />
    </>
  );
}
