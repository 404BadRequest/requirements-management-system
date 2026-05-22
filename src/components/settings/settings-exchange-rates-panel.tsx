"use client";

import type { FinancialReferenceRates } from "@/types/domain";
import { updateFinancialReferenceRatesAction } from "@/app/settings/actions";

export function SettingsExchangeRatesPanel({
  rates,
  canWrite,
  updatedLabel,
}: {
  rates: FinancialReferenceRates;
  canWrite: boolean;
  updatedLabel: string;
}) {
  return (
    <div className="space-y-6">
      {/* Tasas de cambio */}
      <div className="surface-card space-y-6 p-[length:var(--density-inset-pad)]">
        <form action={canWrite ? updateFinancialReferenceRatesAction : undefined} className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Tasas de referencia</h3>
            <p className="text-xs text-muted-foreground">Equivalencias usadas para convertir UF y USD a CLP en reportes y estimados.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="ufToClp" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1 UF en CLP
              </label>
              <input
                id="ufToClp"
                name="ufToClp"
                type="number"
                min={0}
                step="any"
                required
                disabled={!canWrite}
                defaultValue={rates.ufToClp}
                className="field-control w-full tabular-nums"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pesos chilenos equivalentes a una unidad de fomento.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="usdToClp" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1 USD en CLP
              </label>
              <input
                id="usdToClp"
                name="usdToClp"
                type="number"
                min={0}
                step="any"
                required
                disabled={!canWrite}
                defaultValue={rates.usdToClp}
                className="field-control w-full tabular-nums"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tipo de cambio de referencia dólar → peso chileno.
              </p>
            </div>
          </div>

          {/* Capacidad del equipo */}
          <div className="border-t border-border/50 pt-4">
            <div className="space-y-1 mb-3">
              <h3 className="text-sm font-semibold text-foreground">Capacidad del equipo</h3>
              <p className="text-xs text-muted-foreground">
                Horas laborales estándar semanales por persona. Se usa en el banner de utilización personal y en los reportes de utilización del equipo.
              </p>
            </div>
            <div className="flex flex-col gap-2 max-w-xs">
              <label htmlFor="weeklyCapacityHours" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Horas semanales por persona
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="weeklyCapacityHours"
                  name="weeklyCapacityHours"
                  type="number"
                  min={1}
                  max={80}
                  step={1}
                  required
                  disabled={!canWrite}
                  defaultValue={rates.weeklyCapacityHours}
                  className="field-control w-28 tabular-nums"
                />
                <span className="text-sm text-muted-foreground">h / semana</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Entre 1 y 80 horas. Equivale a {rates.weeklyCapacityHours * 4} h mensuales de capacidad teórica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground">
              Última actualización: <span className="tabular-nums">{updatedLabel}</span>
            </p>
            {canWrite ? (
              <button type="submit" className="btn-primary">
                Guardar valores
              </button>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">Solo lectura: se requiere permiso de escritura en configuración.</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
