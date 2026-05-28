import type { ReactNode } from "react";
import { Suspense } from "react";
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

      {/* mt reducido: antes se sumaban mt-6 (flash) + mt-6/8 (rejilla). El flash solo añade mb cuando hay mensaje. */}
      <div className="mt-3 lg:mt-4">
        <Suspense fallback={null}>
          <SettingsFlashBanner />
        </Suspense>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-4 lg:gap-y-4 lg:items-start">
          <aside className="min-w-0 w-full lg:max-w-[15rem]">
            <div className="lg:sticky lg:top-24">
              <SettingsSubNav />
            </div>
          </aside>
          <div className="min-w-0 space-y-4">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
