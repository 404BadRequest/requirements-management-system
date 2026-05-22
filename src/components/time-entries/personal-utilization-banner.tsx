"use client";

import { Clock, TrendingUp, AlertTriangle, CheckCircle2, Minus } from "lucide-react";

type PersonalUtilizationBannerProps = {
  userName: string;
  role: string;
  loggedHours: number;
  capacityHours: number;
  weekLabel: string;
};

function statusProps(utilization: number) {
  if (utilization === 0) {
    return {
      icon: <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />,
      barClass: "bg-muted-foreground/40",
      labelClass: "text-muted-foreground",
      label: "Sin horas registradas",
    };
  }
  if (utilization < 0.6) {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />,
      barClass: "bg-warning",
      labelClass: "text-warning",
      label: "Bajo nivel",
    };
  }
  if (utilization > 1.0) {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />,
      barClass: "bg-danger",
      labelClass: "text-danger",
      label: "Sobre capacidad",
    };
  }
  return {
    icon: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
    barClass: "bg-success",
    labelClass: "text-success",
    label: "En rango óptimo",
  };
}

export function PersonalUtilizationBanner({
  userName,
  role,
  loggedHours,
  capacityHours,
  weekLabel,
}: PersonalUtilizationBannerProps) {
  const utilization = capacityHours > 0 ? loggedHours / capacityHours : 0;
  const percentage = Math.round(utilization * 100);
  const barWidth = Math.min(percentage, 100);
  const { icon, barClass, labelClass, label } = statusProps(utilization);

  return (
    <div className="surface-card-static flex flex-wrap items-center gap-4 px-[length:var(--density-inset-pad)] py-3 sm:flex-nowrap">
      {/* Ícono + encabezado */}
      <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground">
        <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
        <div className="leading-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Mi utilización esta semana
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">{weekLabel}</p>
        </div>
      </div>

      {/* Separador vertical */}
      <div className="hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />

      {/* Info del usuario */}
      <div className="shrink-0 min-w-[10rem]">
        <p className="text-sm font-medium text-foreground">{userName}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>

      {/* Barra de progreso + stats */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barClass}`}
              style={{ width: `${barWidth}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${percentage}% de utilización semanal`}
            />
          </div>
          <span className={`w-10 shrink-0 text-right text-sm font-bold tabular-nums ${labelClass}`}>
            {percentage}%
          </span>
          {icon}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {loggedHours.toFixed(1)}h registradas
          </span>
          <span className={`font-medium ${labelClass}`}>{label}</span>
          <span>{capacityHours}h semanales</span>
        </div>
      </div>
    </div>
  );
}
