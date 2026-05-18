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
    <div className="surface-card space-y-6 p-[length:var(--density-inset-pad)]">
      <form action={canWrite ? updateFinancialReferenceRatesAction : undefined} className="space-y-5">
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
              Pesos chilenos equivalentes a una unidad de fomento, para referencia en lecturas cruzadas.
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
              Tipo de cambio de referencia dólar estadounidense → peso chileno.
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
  );
}
