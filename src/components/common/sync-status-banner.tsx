"use client";

type SyncStatusBannerProps = {
  loading: boolean;
  error?: string | null;
  lastSyncedAt?: string | null;
  onRetry?: () => void;
  loadingLabel?: string;
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SyncStatusBanner({
  loading,
  error,
  lastSyncedAt,
  onRetry,
  loadingLabel = "Actualizando datos…",
}: SyncStatusBannerProps) {
  if (loading) {
    return (
      <div
        className="rounded-[2px] border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm text-foreground"
        role="status"
        aria-live="polite"
      >
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm text-danger"
        role="alert"
      >
        <span>{error}</span>
        {onRetry ? (
          <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={onRetry}>
            Reintentar
          </button>
        ) : null}
      </div>
    );
  }

  if (!lastSyncedAt) return null;

  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      Ultima sincronizacion: {formatTime(lastSyncedAt)}
    </p>
  );
}
