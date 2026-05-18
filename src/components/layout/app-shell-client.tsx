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

type AppShellClientProps = {
  children: ReactNode;
  navLinks: MainNavClientLink[];
  commandItems: CommandNavItem[];
  sessionUser: AppSessionUser | null;
  notificationUnread?: number;
};

export function AppShellClient({
  children,
  navLinks,
  commandItems,
  sessionUser,
  notificationUnread = 0,
}: AppShellClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={null}>
          <FilterStatePersistence />
        </Suspense>
        <Header
          sessionUser={sessionUser}
          commandItems={commandItems}
          navLinks={navLinks}
          notificationUnread={notificationUnread}
        />
        <DensityMain>
          <Breadcrumbs />
          {children}
        </DensityMain>
      </div>
    </div>
  );
}
