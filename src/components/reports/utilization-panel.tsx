"use client";

import { useMemo } from "react";
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react";

export type UtilizationData = {
  userId: string;
  userName: string;
  role: string;
  loggedHours: number;
  capacityHours: number;
};

export function UtilizationPanel({ data }: { data: UtilizationData[] }) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const utilA = a.capacityHours > 0 ? a.loggedHours / a.capacityHours : 0;
      const utilB = b.capacityHours > 0 ? b.loggedHours / b.capacityHours : 0;
      return utilB - utilA; // Mayor utilización primero
    });
  }, [data]);

  const getStatusColor = (utilization: number) => {
    if (utilization < 0.6) return "bg-amber-500"; // Subutilizado
    if (utilization > 1.0) return "bg-rose-500"; // Sobrecargado
    return "bg-emerald-500"; // Óptimo
  };

  const getStatusIcon = (utilization: number) => {
    if (utilization < 0.6) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (utilization > 1.0) return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  };

  const overallLogged = data.reduce((sum, d) => sum + d.loggedHours, 0);
  const overallCapacity = data.reduce((sum, d) => sum + d.capacityHours, 0);
  const overallUtilization = overallCapacity > 0 ? overallLogged / overallCapacity : 0;

  return (
    <section className="surface-card space-y-4 p-[length:var(--density-inset-pad)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Capacidad y Utilización del Equipo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Basado en una capacidad teórica de 40h semanales por persona.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">
            {Math.round(overallUtilization * 100)}%
          </p>
          <p className="text-xs text-muted-foreground">Utilización Global</p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {sortedData.map((user) => {
          const utilization = user.capacityHours > 0 ? user.loggedHours / user.capacityHours : 0;
          const percentage = Math.round(utilization * 100);
          const barWidth = Math.min(percentage, 100); // Cap visual at 100%
          
          return (
            <div key={user.userId} className="flex items-center gap-4">
              <div className="w-48 shrink-0">
                <p className="truncate text-sm font-medium text-foreground">{user.userName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${getStatusColor(utilization)}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">
                    {percentage}%
                  </div>
                  <div className="w-4 shrink-0">
                    {getStatusIcon(utilization)}
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{user.loggedHours.toFixed(1)}h registradas</span>
                  <span>{user.capacityHours}h capacidad</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
