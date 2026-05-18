import { PageHeader } from "@/components/common/page-header";
import { RmsLoader } from "@/components/common/rms-loader";

export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[1760px] space-y-4 px-3 py-4 sm:px-4">
        <PageHeader
          title="Mi cuenta"
          description="Cargando información de sesión y perfil actual…"
        />
        <section className="surface-card grid max-w-lg gap-3 p-[length:var(--density-inset-pad)] sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
              <div className="skeleton-shimmer mt-2 h-5 w-full rounded-[2px]" />
            </div>
          ))}
        </section>
      </main>
      <RmsLoader
        title="Cargando cuenta..."
        description="Sincronizando datos de usuario y rol vigente."
      />
    </div>
  );
}
