import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { DensityToggle } from "@/components/common/density-toggle";
import { ThemePreferenceSelect } from "@/components/layout/theme-toggle";
import { getAppSession } from "@/lib/auth/session";
import { getAuthCredentialStatusByUserIds } from "@/lib/auth/authjs-identities";
import { getUsers } from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { getAuthProviderKind, isPostgresConfigured } from "@/lib/postgres/env";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const { user } = await getAppSession();
  if (!user) {
    redirect("/login");
  }

  const authProvider = getAuthProviderKind();
  const canChangePassword = authProvider === "authjs" && isPostgresConfigured();
  let hasCredentials = false;

  if (canChangePassword) {
    const users = await getUsers();
    const directoryUserId = resolveDirectoryUserIdForSession(user, users);
    const credentialStatus = await getAuthCredentialStatusByUserIds([directoryUserId, user.id]);
    hasCredentials = credentialStatus[directoryUserId] || credentialStatus[user.id] || false;
  }

  return (
    <AppShell>
      <PageHeader
        title="Mi cuenta"
        description="Datos de la sesión actual y gestión de tu acceso al sistema."
      />
      <div className="grid items-start gap-6 md:grid-cols-2 max-w-5xl">
        <dl className="surface-card grid gap-3 p-[length:var(--density-inset-pad)] text-sm sm:grid-cols-2">
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

        <section className="surface-card p-[length:var(--density-inset-pad)]">
          <h2 className="text-base font-semibold text-foreground">Preferencias de visualización</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ajusta el tema y la densidad de la interfaz según tu preferencia.</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="min-w-20 text-sm font-medium text-foreground">Tema</label>
              <ThemePreferenceSelect />
            </div>
            <div className="flex items-center gap-3">
              <label className="min-w-20 text-sm font-medium text-foreground">Densidad</label>
              <DensityToggle />
            </div>
          </div>
        </section>

        {canChangePassword ? (
          <section className="surface-card p-[length:var(--density-inset-pad)]">
            <h2 className="text-base font-semibold text-foreground">Cambiar contraseña</h2>
            {hasCredentials ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Actualiza la contraseña con la que inicias sesión en Requirement System TI.
                </p>
                <div className="mt-4">
                  <ChangePasswordForm />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Tu acceso aún no tiene contraseña configurada. Un administrador debe definirla desde Configuración → Usuarios.
              </p>
            )}
          </section>
        ) : (
          <section className="surface-card p-[length:var(--density-inset-pad)]">
            <h2 className="text-base font-semibold text-foreground">Contraseña</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              El cambio de contraseña desde esta pantalla solo está disponible con acceso por credenciales del sistema.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
