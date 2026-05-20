import Image from "next/image";

type RmsLoaderProps = {
  title?: string;
  description?: string;
  overlay?: boolean;
};

export function RmsLoader({
  title = "Cargando módulo",
  description = "Estamos preparando la vista para mostrar la información actualizada.",
  overlay = true,
}: RmsLoaderProps) {
  return (
    <div
      className={
        overlay
          ? "loader-overlay-enter pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-transparent px-4 backdrop-blur-[1px]"
          : "min-h-screen bg-background"
      }
    >
      <div className="mx-auto flex w-full max-w-[1760px] items-center justify-center">
        <section
          className="surface-card loader-card-enter pointer-events-auto flex w-full max-w-md flex-col items-center gap-4 bg-card/92 p-8 text-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="relative flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-border border-t-primary" aria-hidden />
            <span className="inline-flex h-16 w-16 animate-spin items-center justify-center [animation-duration:1800ms]">
              <Image
                src="/brand/rst-shield-checkflow-mark.svg"
                alt="Escudo Requirement System TI"
                width={56}
                height={56}
                className="h-14 w-14 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                priority
              />
            </span>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
