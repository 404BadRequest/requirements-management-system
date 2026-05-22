import { AlertTriangle, Clock, Activity, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ProjectHealthData = {
  clientId: string;
  clientName: string;
  consumptionPercentage: number;
  hoursWithoutRequirement: number;
  oldestRequirementDays: number;
  blockedRequirements: number;
};

export function ProjectHealthCards({ data }: { data: ProjectHealthData[] }) {
  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="project-health-heading" className="space-y-4">
      <h2 id="project-health-heading" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Salud de Proyectos
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((project) => {
          const isAtRisk = project.consumptionPercentage >= 90 || project.blockedRequirements > 0 || project.hoursWithoutRequirement > 10;
          
          return (
            <div key={project.clientId} className={cn("surface-card flex flex-col p-4", isAtRisk && "border-warning/50")}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm truncate" title={project.clientName}>{project.clientName}</h3>
                {isAtRisk ? <ShieldAlert className="h-4 w-4 text-warning" /> : <Activity className="h-4 w-4 text-success" />}
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Presupuesto</p>
                  <p className={cn("font-medium mt-0.5", project.consumptionPercentage >= 90 ? "text-danger" : project.consumptionPercentage >= 75 ? "text-warning" : "text-foreground")}>
                    {project.consumptionPercentage.toFixed(1)}%
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Horas sin req.</p>
                  <p className={cn("font-medium mt-0.5", project.hoursWithoutRequirement > 0 ? "text-warning" : "text-foreground")}>
                    {project.hoursWithoutRequirement.toFixed(1)} h
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Req. más antiguo</p>
                  <p className="font-medium mt-0.5 text-foreground">
                    {project.oldestRequirementDays > 0 ? `${project.oldestRequirementDays} días` : "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Bloqueados</p>
                  <p className={cn("font-medium mt-0.5", project.blockedRequirements > 0 ? "text-danger" : "text-foreground")}>
                    {project.blockedRequirements}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
