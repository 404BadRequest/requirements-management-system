import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import Link from "next/link";
import { getProfiles, getRequirements, getTimeEntries, getUsers } from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { TeamDirectoryTable } from "@/app/team/team-directory-table";
import { buildTeamDirectoryRows } from "@/app/team/team-page-utils";

export default async function TeamPage() {
  await requirePermission("team.read");
  const { user } = await getAppSession();
  const canExport = user ? roleHasPermission(user.role, "exports.run") : false;

  const [users, entries, requirements, profiles] = await Promise.all([
    getUsers(),
    getTimeEntries(),
    getRequirements(),
    getProfiles(),
  ]);
  const rows = buildTeamDirectoryRows(users, entries, requirements, profiles);

  const exportHref = "/api/export/team";
  const reportsHref = "/reports";

  return (
    <AppShell>
      <PageHeader
        title="Equipo"
        description="Directorio denso con horas imputadas, tarifas de referencia y carga de requerimientos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={reportsHref} className="btn-secondary py-2 text-sm no-underline">
              Ver reportes del equipo
            </Link>
            {canExport ? (
              <a href={exportHref} className="btn-secondary inline-flex py-2 text-sm no-underline">
                Exportar CSV
              </a>
            ) : null}
          </div>
        }
      />
      <div className="surface-card p-[length:var(--density-inset-pad)]">
        <TeamDirectoryTable rows={rows} />
      </div>
    </AppShell>
  );
}
