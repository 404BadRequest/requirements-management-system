import type { ReactNode } from "react";
import { Suspense } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { SettingsFlashBanner } from "@/components/settings/settings-flash-banner";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";
import { requirePermission } from "@/lib/auth/rsc-guard";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requirePermission("settings.read");

  return (
    <AppShell>
      <PageHeader
        title="Configuración"
        description="Centro de control de personas, tarifas, clientes y catálogos que alimentan requerimientos, horas y presupuesto."
      />
      <div className="surface-card max-w-4xl p-[length:var(--density-inset-pad)]">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-border bg-muted text-foreground">
            <SettingsIcon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 max-w-prose space-y-1">
            <p className="text-sm font-medium text-foreground">Área administrativa</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Los cambios aplican según el origen de datos activo (mock, Supabase o Postgres con `DATA_PROVIDER`). Usa el menú lateral
              para moverte entre módulos relacionados.
            </p>
          </div>
        </div>
      </div>

      {/* mt reducido: antes se sumaban mt-6 (flash) + mt-6/8 (rejilla). El flash solo añade mb cuando hay mensaje. */}
      <div className="mt-3 lg:mt-4">
        <Suspense fallback={null}>
          <SettingsFlashBanner />
        </Suspense>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-4 lg:gap-y-6 lg:items-start">
          <aside className="min-w-0 w-full lg:max-w-[15rem]">
            <div className="lg:sticky lg:top-24">
              <SettingsSubNav />
            </div>
          </aside>
          <div className="min-w-0 space-y-6">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
