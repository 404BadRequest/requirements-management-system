import Link from "next/link";
import { loginAction } from "@/app/login/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error = "", next = "/dashboard" } = await searchParams;
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="surface-card w-full max-w-md p-8 shadow-soft">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">Iniciar sesión</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Requirements Management System</p>
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
            <span className="field-label">Contraseña</span>
            <input name="password" type="password" autoComplete="current-password" required className="field-control" />
          </label>
          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si auth no está configurada, puedes seguir en modo local.{" "}
          <Link href="/dashboard" className="text-foreground underline">
            Ir al dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
