import type { ReactNode } from "react";
import { getAppSession } from "@/lib/auth/session";
import { filterCommandNavForRole, filterMainNavForRole } from "@/lib/navigation/filter-nav";
import { roleHasPermission } from "@/lib/auth/permissions";
import { getNotificationUnreadCountForSession } from "@/app/notifications/data-actions";
import { AppShellClient } from "@/components/layout/app-shell-client";

export async function AppShell({ children }: { children: ReactNode }) {
  const { user } = await getAppSession();
  const navLinks = filterMainNavForRole(user?.role);
  const commandItems = filterCommandNavForRole(user?.role);

  let notificationUnread = 0;
  if (user && roleHasPermission(user.role, "notifications.read")) {
    notificationUnread = await getNotificationUnreadCountForSession();
  }

  return (
    <AppShellClient
      navLinks={navLinks}
      commandItems={commandItems}
      sessionUser={user}
      notificationUnread={notificationUnread}
      chatUnread={0}
    >
      {children}
    </AppShellClient>
  );
}
