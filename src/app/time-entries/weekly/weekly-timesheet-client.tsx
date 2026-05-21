"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTimeEntriesBatchAction } from "@/app/time-entries/new/data-actions";
import type { TimeEntry } from "@/types/domain";

// Utilidades de fechas
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });
}

// Tipos para la grilla
type GridRow = {
  id: string; // ID temporal para la UI
  clientId: string;
  projectId: string;
  requirementId: string | null;
  contractId: string | null;
  contractProfileId: string | null;
  category: string;
  taskDescription: string;
  observations: string;
  // Horas por día (lunes a domingo, índices 0-6)
  hours: (number | null)[];
};

export function WeeklyTimesheetClient({
  entries,
  users,
  clients,
  requirements,
  contracts,
  contractProfiles,
  categories,
  targetUserId,
  canPickAnyOwner,
  initialWeekStart,
}: {
  entries: TimeEntry[];
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  requirements: { id: string; title: string; clientId: string }[];
  contracts: { id: string; clientId: string; label: string }[];
  contractProfiles: { id: string; label: string }[];
  categories: { code: string; label: string }[];
  targetUserId: string;
  canPickAnyOwner: boolean;
  initialWeekStart?: string;
}) {
  const router = useRouter();
  
  // Estado de la semana actual
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (initialWeekStart) {
      const d = new Date(initialWeekStart + "T12:00:00Z");
      if (!isNaN(d.getTime())) return getMonday(d);
    }
    return getMonday(new Date());
  });

  const [saving, setSaving] = useState(false);

  // Días de la semana actual
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekDatesStr = useMemo(() => weekDays.map(formatDate), [weekDays]);

  // Estado de las filas (inicializado con las entradas existentes de la semana)
  const [rows, setRows] = useState<GridRow[]>(() => {
    // Agrupar entradas existentes por requerimiento/categoría
    const existingRows = new Map<string, GridRow>();
    
    entries.forEach(entry => {
      // Solo considerar entradas de esta semana
      const entryDate = entry.date;
      const dayIndex = weekDatesStr.indexOf(entryDate);
      if (dayIndex === -1) return;
      
      const key = `${entry.projectId}-${entry.requirementId}-${entry.category}`;
      
      if (!existingRows.has(key)) {
        const req = requirements.find(r => r.id === entry.requirementId);
        const contract = contracts.find(c => c.id === entry.contractId);
        const clientId = req?.clientId || contract?.clientId || "";

        existingRows.set(key, {
          id: `row-${crypto.randomUUID()}`,
          clientId,
          projectId: entry.projectId,
          requirementId: entry.requirementId,
          contractId: entry.contractId,
          contractProfileId: entry.contractProfileId,
          category: entry.category,
          taskDescription: entry.taskDescription,
          observations: entry.observations,
          hours: Array(7).fill(null),
        });
      }
      
      const row = existingRows.get(key)!;
      // Sumar horas si hay múltiples entradas el mismo día para el mismo requerimiento
      const currentHours = row.hours[dayIndex] || 0;
      row.hours[dayIndex] = currentHours + (entry.durationMinutes / 60);
    });
    
    // Si no hay filas, agregar una vacía por defecto
    if (existingRows.size === 0) {
      return [{
        id: `row-${crypto.randomUUID()}`,
        clientId: "",
        projectId: "proj-main",
        requirementId: null,
        contractId: null,
        contractProfileId: null,
        category: categories[0]?.code || "",
        taskDescription: "",
        observations: "",
        hours: Array(7).fill(null),
      }];
    }
    
    return Array.from(existingRows.values());
  });

  // Navegación de semanas
  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));
  const currentWeek = () => setWeekStart(getMonday(new Date()));

  // Modificación de filas
  const addRow = () => {
    setRows(prev => [...prev, {
      id: `row-${crypto.randomUUID()}`,
      clientId: "",
      projectId: "proj-main",
      requirementId: null,
      contractId: null,
      contractProfileId: null,
      category: categories[0]?.code || "",
      taskDescription: "",
      observations: "",
      hours: Array(7).fill(null),
    }]);
  };

  const updateRow = (index: number, field: keyof GridRow, value: any) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
  };

  const updateHour = (rowIndex: number, dayIndex: number, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    if (value !== "" && (isNaN(numValue as number) || (numValue as number) < 0 || (numValue as number) > 24)) return;
    
    setRows(prev => {
      const newRows = [...prev];
      const newHours = [...newRows[rowIndex].hours];
      newHours[dayIndex] = numValue;
      newRows[rowIndex] = { ...newRows[rowIndex], hours: newHours };
      return newRows;
    });
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Cálculos de totales
  const dailyTotals = useMemo(() => {
    const totals = Array(7).fill(0);
    rows.forEach(row => {
      row.hours.forEach((h, i) => {
        if (h !== null) totals[i] += h;
      });
    });
    return totals;
  }, [rows]);

  const weeklyTotal = dailyTotals.reduce((sum, val) => sum + val, 0);

  // Guardar cambios
  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Guardando horas...");
    
    try {
      // Filtrar solo las filas que tienen horas y descripción
      const validRows = rows.filter(r => 
        r.taskDescription.trim() !== "" && 
        r.hours.some(h => h !== null && h > 0)
      );
      
      if (validRows.length === 0) {
        toast.error("No hay horas válidas para guardar. Asegúrate de incluir una descripción.", { id: toastId });
        setSaving(false);
        return;
      }

      // Convertir a formato de batch
      for (const row of validRows) {
        const blocks = [];
        
        for (let i = 0; i < 7; i++) {
          const hours = row.hours[i];
          if (hours !== null && hours > 0) {
            // Convertir horas decimales a HH:MM
            const totalMinutes = Math.round(hours * 60);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            
            // Asumimos inicio a las 09:00 por simplicidad en carga masiva
            const startHour = 9;
            const endHour = startHour + h + Math.floor(m / 60);
            const endMin = m % 60;
            
            blocks.push({
              date: weekDatesStr[i],
              startTime: `${String(startHour).padStart(2, '0')}:00`,
              endTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
            });
          }
        }
        
        if (blocks.length > 0) {
          await createTimeEntriesBatchAction({
            projectId: row.projectId,
            requirementId: row.requirementId,
            contractId: row.contractId,
            contractProfileId: row.contractProfileId,
            category: row.category,
            taskDescription: row.taskDescription,
            userId: targetUserId,
            observations: row.observations,
            blocks,
          });
        }
      }
      
      toast.success("Horas guardadas exitosamente", { id: toastId });
      router.refresh();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar las horas", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2px] border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevWeek} className="btn-secondary p-1.5" aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={currentWeek} className="btn-secondary px-3 py-1.5 text-xs">
            Hoy
          </button>
          <button type="button" onClick={nextWeek} className="btn-secondary p-1.5" aria-label="Semana siguiente">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-medium">
            {formatDisplayDate(weekDays[0])} - {formatDisplayDate(weekDays[6])}
          </span>
        </div>
        
        {canPickAnyOwner && (
          <div className="flex items-center gap-2">
            <label htmlFor="user-select" className="text-xs font-medium text-muted-foreground">Usuario:</label>
            <select 
              id="user-select"
              className="field-control text-sm"
              value={targetUserId}
              onChange={(e) => {
                const params = new URLSearchParams(window.location.search);
                params.set("userId", e.target.value);
                params.set("weekStart", formatDate(weekStart));
                router.push(`/time-entries/weekly?${params.toString()}`);
              }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grilla principal */}
      <div className="overflow-x-auto rounded-[2px] border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="min-w-[150px] p-3 font-semibold">Cliente</th>
              <th className="min-w-[150px] p-3 font-semibold">Contrato</th>
              <th className="min-w-[200px] p-3 font-semibold">Requerimiento</th>
              <th className="min-w-[150px] p-3 font-semibold">Categoría</th>
              <th className="min-w-[200px] p-3 font-semibold">Descripción</th>
              {weekDays.map((day, i) => (
                <th key={i} className="w-20 p-3 text-center font-semibold">
                  <div className="flex flex-col items-center">
                    <span>{day.toLocaleDateString("es-CL", { weekday: "short" })}</span>
                    <span className="text-[10px] opacity-70">{day.getDate()}</span>
                  </div>
                </th>
              ))}
              <th className="w-20 p-3 text-center font-semibold">Total</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, rowIndex) => {
              const rowTotal = row.hours.reduce((sum, val) => (sum || 0) + (val || 0), 0) || 0;
              
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="p-2">
                    <select
                      className="field-control w-full text-xs"
                      value={row.clientId}
                      onChange={(e) => {
                        const newClientId = e.target.value;
                        setRows(prev => {
                          const newRows = [...prev];
                          newRows[rowIndex] = {
                            ...newRows[rowIndex],
                            clientId: newClientId,
                            contractId: null,
                            requirementId: null
                          };
                          return newRows;
                        });
                      }}
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="field-control w-full text-xs"
                      value={row.contractId || ""}
                      onChange={(e) => updateRow(rowIndex, "contractId", e.target.value || null)}
                      disabled={!row.clientId}
                    >
                      <option value="">Sin contrato</option>
                      {contracts
                        .filter(c => c.clientId === row.clientId)
                        .map(c => (
                        <option key={c.id} value={c.id} title={c.label}>
                          {c.label.length > 20 ? c.label.substring(0, 20) + "..." : c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="field-control w-full text-xs"
                      value={row.requirementId || ""}
                      onChange={(e) => updateRow(rowIndex, "requirementId", e.target.value || null)}
                      disabled={!row.clientId}
                    >
                      <option value="">Sin requerimiento</option>
                      {requirements
                        .filter(req => req.clientId === row.clientId)
                        .map(req => (
                        <option key={req.id} value={req.id} title={req.title}>
                          {req.title.length > 30 ? req.title.substring(0, 30) + "..." : req.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className="field-control w-full text-xs"
                      value={row.category}
                      onChange={(e) => updateRow(rowIndex, "category", e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.code} value={cat.code}>{cat.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="field-control w-full text-xs"
                      placeholder="¿Qué hiciste?"
                      value={row.taskDescription}
                      onChange={(e) => updateRow(rowIndex, "taskDescription", e.target.value)}
                    />
                  </td>
                  {row.hours.map((hours, dayIndex) => (
                    <td key={dayIndex} className="p-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        className="field-control w-full text-center text-xs"
                        placeholder="-"
                        value={hours === null ? "" : hours}
                        onChange={(e) => updateHour(rowIndex, dayIndex, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center font-medium text-muted-foreground">
                    {rowTotal > 0 ? rowTotal.toFixed(1) : "-"}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Eliminar fila"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 font-medium">
            <tr>
              <td colSpan={5} className="p-3 text-right text-xs uppercase text-muted-foreground">
                Total Semanal
              </td>
              {dailyTotals.map((total, i) => (
                <td key={i} className={`p-3 text-center ${total > 8 ? 'text-amber-600' : ''}`}>
                  {total > 0 ? total.toFixed(1) : "-"}
                </td>
              ))}
              <td className="p-3 text-center font-bold text-primary">
                {weeklyTotal > 0 ? weeklyTotal.toFixed(1) : "-"}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Acciones inferiores */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir fila
        </button>
        
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar semana
        </button>
      </div>
    </div>
  );
}
