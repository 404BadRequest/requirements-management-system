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
        title="UF y dólar (referencia)"
        description="Montos de referencia en pesos chilenos para 1 UF y 1 USD. Se usan para calcular el equivalente CLP en reportes y en el estimado facturable del dashboard cuando un perfil cotiza en UF o USD."
      />
      <SettingsExchangeRatesPanel rates={rates} canWrite={canWrite} updatedLabel={updatedLabel} />
    </>
  );
}
