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
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] border border-primary bg-primary text-sm font-semibold text-primary-foreground">
              R
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
