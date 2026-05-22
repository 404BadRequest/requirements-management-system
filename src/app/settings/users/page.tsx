import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { SettingsUsersPanel } from "@/components/settings/settings-users-panel";
import { getProfiles, getUsers } from "@/data/repositories/server-db";
import { getAuthCredentialStatusByUserIds } from "@/lib/auth/authjs-identities";
import { getAuthProviderKind } from "@/lib/postgres/env";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsUsersPage() {
  const sessionUser = await requirePermission("settings.read");
  const canWrite = roleHasPermission(sessionUser.role, "settings.write");
  const [users, profiles] = await Promise.all([getUsers(), getProfiles()]);
  const credentialsByUserId = await getAuthCredentialStatusByUserIds(users.map((u) => u.id));
  const sortedProfiles = [...profiles].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const showCredentialStatus = getAuthProviderKind() === "authjs";

  return (
    <>
      <SettingsPageIntro
        eyebrow="Equipo y datos"
        title="Usuarios"
        description="Gestión tabular del equipo: crear, editar y eliminar desde una sola vista. Las altas y ediciones se hacen en ventanas modales."
      />
      <SettingsUsersPanel
        users={sortedUsers}
        profiles={sortedProfiles.map((p) => ({ id: p.id, name: p.name }))}
        showCredentialStatus={showCredentialStatus}
        credentialsByUserId={credentialsByUserId}
        canWrite={canWrite}
      />
    </>
  );
}
