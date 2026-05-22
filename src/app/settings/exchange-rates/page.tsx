import { SettingsExchangeRatesPanel } from "@/components/settings/settings-exchange-rates-panel";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { getFinancialReferenceRates } from "@/data/repositories/server-db";
import { getAppSession } from "@/lib/auth/session";
import { roleHasPermission } from "@/lib/auth/permissions";

export default async function SettingsExchangeRatesPage() {
  const rates = await getFinancialReferenceRates();
  const { user } = await getAppSession();
  const canWrite = user ? roleHasPermission(user.role, "settings.write") : false;
  const updatedLabel = new Date(rates.updatedAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <SettingsPageIntro
        eyebrow="Equipo y datos"
        title="Tasas y capacidad"
        description="Tasas de referencia UF/USD en CLP para reportes y estimados facturables, y capacidad laboral semanal estándar del equipo usada en indicadores de utilización."
      />
      <SettingsExchangeRatesPanel rates={rates} canWrite={canWrite} updatedLabel={updatedLabel} />
    </>
  );
}
