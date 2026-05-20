"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import type { MainNavClientLink } from "@/components/layout/nav-links";
import type { CommandNavItem } from "@/lib/navigation/filter-nav";
import type { AppSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DensityMain } from "@/components/layout/density-main";
import { FilterStatePersistence } from "@/components/layout/filter-state-persistence";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { ChatInboxNotifier } from "@/components/chat/chat-inbox-notifier";
import { useState } from "react";

type AppShellClientProps = {
  children: ReactNode;
  navLinks: MainNavClientLink[];
  commandItems: CommandNavItem[];
  sessionUser: AppSessionUser | null;
  notificationUnread?: number;
  chatUnread?: number;
};

export function AppShellClient({
  children,
  navLinks,
  commandItems,
  sessionUser,
  notificationUnread = 0,
  chatUnread = 0,
}: AppShellClientProps) {
  const [chatUnreadState, setChatUnreadState] = useState(chatUnread);
  const canReadChat = navLinks.some((link) => link.href === "/chat");
  return (
    <div className="min-h-screen bg-background">
      <RouteProgressBar />
      <ChatInboxNotifier enabled={canReadChat} onUnreadCountChange={setChatUnreadState} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={null}>
          <FilterStatePersistence />
        </Suspense>
        <Header
          sessionUser={sessionUser}
          commandItems={commandItems}
          navLinks={navLinks}
          notificationUnread={notificationUnread}
          chatUnread={chatUnreadState}
        />
        <DensityMain>
          <Breadcrumbs />
          {children}
        </DensityMain>
      </div>
    </div>
  );
}
