import type { ReactNode } from "react";
import { getAppSession } from "@/lib/auth/session";
import { filterCommandNavForRole, filterMainNavForRole } from "@/lib/navigation/filter-nav";
import { roleHasPermission } from "@/lib/auth/permissions";
import { getNotificationUnreadCountForSession } from "@/app/notifications/data-actions";
import { AppShellClient } from "@/components/layout/app-shell-client";
import { requireChatSession } from "@/app/chat/chat-auth";
import { loadChatUnreadSummary } from "@/lib/chat/service";

export async function AppShell({ children }: { children: ReactNode }) {
  const { user } = await getAppSession();
  const navLinks = filterMainNavForRole(user?.role);
  const commandItems = filterCommandNavForRole(user?.role);

  let notificationUnread = 0;
  if (user && roleHasPermission(user.role, "notifications.read")) {
    notificationUnread = await getNotificationUnreadCountForSession();
  }
  let chatUnread = 0;
  if (user && roleHasPermission(user.role, "chat.read")) {
    try {
      const { meUserId } = await requireChatSession("chat.read");
      chatUnread = (await loadChatUnreadSummary(meUserId)).totalUnread;
    } catch {
      chatUnread = 0;
    }
  }

  return (
    <AppShellClient
      navLinks={navLinks}
      commandItems={commandItems}
      sessionUser={user}
      notificationUnread={notificationUnread}
      chatUnread={chatUnread}
    >
      {children}
    </AppShellClient>
  );
}
