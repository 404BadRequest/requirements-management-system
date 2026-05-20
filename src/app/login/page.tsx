import { loginAction } from "@/app/login/actions";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error = "", next = "/dashboard" } = await searchParams;
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(20,60,180,0.11),transparent_45%),radial-gradient(circle_at_84%_12%,rgba(40,130,255,0.1),transparent_42%),radial-gradient(circle_at_52%_88%,rgba(20,60,180,0.08),transparent_40%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-4 py-8 lg:grid-cols-[1.15fr,0.85fr] lg:px-8">
        <section className="surface-card border border-primary/20 bg-primary/5 p-6 shadow-soft lg:p-10">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[2px] border border-primary/25 bg-background/85 px-3 py-2">
              <Image
                src="/brand/rst-shield-checkflow-mark.svg"
                alt="Isotipo Requirement System TI"
                width={64}
                height={64}
                className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"
                priority
              />
              <div className="min-w-0">
                <div className="inline-flex max-w-full flex-col">
                  <p className="truncate text-[1.45rem] font-bold uppercase tracking-[0.06em] text-[#0B1F3A] sm:text-[1.7rem]">
                    Requirement System
                  </p>
                  <div className="mt-0.5 flex items-center gap-3">
                    <p className="text-[1.05rem] font-semibold uppercase tracking-[0.24em] text-primary">TI</p>
                    <span className="h-px min-w-16 flex-1 bg-primary/30 sm:min-w-24" aria-hidden />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <h1 className="mt-6 max-w-[18ch] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Gestion de requerimientos TI con foco operativo y control contractual.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Centraliza requerimientos, horas, contratos y trazabilidad en un solo flujo para equipos de tecnologia y
            gestion de proyectos.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[2px] border border-border/80 bg-background/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requerimientos</p>
              <p className="mt-2 text-xl font-semibold text-foreground">360</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Seguimiento de ciclo completo</p>
            </article>
            <article className="rounded-[2px] border border-border/80 bg-background/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Horas</p>
              <p className="mt-2 text-xl font-semibold text-foreground">UF Eq.</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Control por perfil contractual</p>
            </article>
            <article className="rounded-[2px] border border-border/80 bg-background/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contratos</p>
              <p className="mt-2 text-xl font-semibold text-foreground">Riesgo</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Indicadores para decision temprana</p>
            </article>
          </div>
        </section>

        <section className="surface-card w-full p-6 shadow-soft sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Iniciar sesion</h2>
          <p className="mt-2 text-sm text-muted-foreground">Accede para gestionar requerimientos TI y presupuesto contractual.</p>
          {error ? (
            <p className="mt-4 rounded-[2px] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-foreground" role="alert">
              {decodeURIComponent(error)}
            </p>
          ) : null}
          <form action={loginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={safeNext} />
            <label className="grid gap-1.5">
              <span className="field-label">Correo</span>
              <input name="email" type="email" autoComplete="email" required className="field-control" />
            </label>
            <label className="grid gap-1.5">
              <span className="field-label">Contrasena</span>
              <input name="password" type="password" autoComplete="current-password" required className="field-control" />
            </label>
            <button type="submit" className="btn-primary w-full">
              Entrar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
