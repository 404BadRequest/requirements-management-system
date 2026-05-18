import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { loadNotificationsForSession } from "@/app/notifications/data-actions";
import { NotificationsPageClient } from "@/app/notifications/notifications-page-client";

export default async function NotificationsPage() {
  await requirePermission("notifications.read");
  const { items } = await loadNotificationsForSession();

  return (
    <AppShell>
      <PageHeader
        title="Avisos"
        description="Alertas por cambios en requerimientos donde participas como responsable. Las marcas como leídas se sincronizan al instante."
      />
      <NotificationsPageClient initialItems={items} />
    </AppShell>
  );
}
