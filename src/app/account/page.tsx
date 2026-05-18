import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { getAppSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const { user } = await getAppSession();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell>
      <PageHeader title="Mi cuenta" description="Datos de la sesión actual enlazados con el proveedor de auth activo y el perfil RMS." />
      <dl className="surface-card grid max-w-lg gap-3 p-[length:var(--density-inset-pad)] text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</dt>
          <dd className="mt-1 font-medium text-foreground">{user.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol</dt>
          <dd className="mt-1 font-medium text-foreground">{user.role}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo</dt>
          <dd className="mt-1 font-medium text-foreground">{user.email || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificador</dt>
          <dd className="mt-1 break-all font-mono text-xs text-foreground">{user.id}</dd>
        </div>
      </dl>
    </AppShell>
  );
}
