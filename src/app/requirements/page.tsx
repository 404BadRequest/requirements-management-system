import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";
import { RequirementsPageClient } from "@/app/requirements/requirements-page-client";
import { getUsers } from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; clientId?: string }>;
}) {
  const user = await requirePermission("requirements.read");
  const canWrite = roleHasPermission(user.role, "requirements.write");
  const canDelete = roleHasPermission(user.role, "requirements.delete");
  const canReassignOwner = user.role === "Admin" || user.role === "Project Manager";
  const canManageRequirement = canReassignOwner;
  const canChangeStatus = canWrite;

  const canExport = roleHasPermission(user.role, "exports.run");
  const canViewSettings = roleHasPermission(user.role, "settings.read");
  const { nueva, clientId = "" } = await searchParams;
  const autoOpenNewModal = canWrite && (nueva === "1" || nueva === "true");

  const users = await getUsers();
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(user, users);

  return (
    <AppShell>
      <RequirementsPageClient
        canWrite={canWrite}
        canDelete={canDelete}
        canExport={canExport}
        canReassignOwner={canReassignOwner}
        canManageRequirement={canManageRequirement}
        canChangeStatus={canChangeStatus}
        canViewSettings={canViewSettings}
        autoOpenNewModal={autoOpenNewModal}
        clientId={clientId}
        currentDirectoryUserId={currentDirectoryUserId}
      />
    </AppShell>
  );
}
