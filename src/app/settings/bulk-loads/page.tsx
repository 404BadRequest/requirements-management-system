import { redirect } from "next/navigation";
import { SettingsPageIntro } from "@/components/settings/settings-page-intro";
import { SettingsBulkRequirementsUploadSection } from "@/components/settings/settings-bulk-requirements-upload-section";
import { TimeEntriesBulkUploadSection } from "@/components/time-entries/time-entries-bulk-upload-section";
import { requirePermission } from "@/lib/auth/rsc-guard";

export default async function SettingsBulkLoadsPage() {
  const user = await requirePermission("settings.read");
  if (user.role !== "Admin" && user.role !== "Project Manager") {
    redirect("/settings/profiles");
  }

  return (
    <>
      <SettingsPageIntro
        eyebrow="Operación"
        title="Cargas masivas"
        description="Centraliza las importaciones operativas desde plantillas CSV para horas y requerimientos."
      />
      <div className="space-y-4">
        <TimeEntriesBulkUploadSection />
        <SettingsBulkRequirementsUploadSection />
      </div>
    </>
  );
}
