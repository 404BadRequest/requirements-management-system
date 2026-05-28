import {
  RequirementCubicacionBanner,
  type RequirementCubicacionBannerProps,
} from "@/components/requirements/requirement-cubicacion-banner";

function KpiMiniCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="surface-card border border-border/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}

export function RequirementDetailSummaryTab({
  totalHoursDisplay,
  imputationCount,
  tasksDone,
  tasksTotal,
  cubicacion,
}: {
  totalHoursDisplay: string;
  imputationCount: number;
  tasksDone: number;
  tasksTotal: number;
  cubicacion: RequirementCubicacionBannerProps | null;
}) {
  const taskProgress =
    tasksTotal > 0 ? `${tasksDone}/${tasksTotal} completadas` : "Sin tareas definidas";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiMiniCard label="Horas registradas" value={totalHoursDisplay} hint={`${imputationCount} imputación(es)`} />
        <KpiMiniCard
          label="Registros de horas"
          value={String(imputationCount)}
          hint={imputationCount === 0 ? "Aún no hay horas en este REQ" : undefined}
        />
        <KpiMiniCard label="Plan de trabajo" value={tasksTotal > 0 ? `${tasksDone}/${tasksTotal}` : "—"} hint={taskProgress} />
      </div>

      {cubicacion ? <RequirementCubicacionBanner {...cubicacion} variant="compact" /> : null}
    </div>
  );
}
