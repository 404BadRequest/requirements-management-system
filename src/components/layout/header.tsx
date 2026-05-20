"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/common/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import type { AppSessionUser } from "@/lib/auth/session";
import type { CommandNavItem } from "@/lib/navigation/filter-nav";
import { isNavActive, type MainNavClientLink } from "@/components/layout/nav-links";
import { MainNavIcon } from "@/components/layout/main-nav-icon";
import { cn } from "@/lib/utils/cn";

type HeaderProps = {
  sessionUser: AppSessionUser | null;
  commandItems: CommandNavItem[];
  navLinks: MainNavClientLink[];
  notificationUnread?: number;
};

export const Header = ({ sessionUser, commandItems, navLinks, notificationUnread = 0 }: HeaderProps) => (
  <HeaderInner sessionUser={sessionUser} commandItems={commandItems} navLinks={navLinks} notificationUnread={notificationUnread} />
);

function HeaderInner({ sessionUser, commandItems, navLinks, notificationUnread }: HeaderProps) {
  const unread = notificationUnread ?? 0;
  const [lastUpdated, setLastUpdated] = useState("--:--");
  useEffect(() => {
    const value = new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    setLastUpdated(value);
  }, []);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card shadow-soft menu-fade-in">
      <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-3 px-3 py-2.5 md:justify-center sm:px-4">
        <MobileNav links={navLinks} />
        <div className="hidden items-center md:flex">
          <div className="flex min-w-[21rem] items-center gap-2.5 rounded-[2px] border border-primary/25 bg-background/85 px-2.5 py-1.5 shadow-soft">
            <Image
              src="/brand/rst-shield-checkflow-mark.svg"
              alt="Requirement System TI"
              width={44}
              height={44}
              className="h-9 w-9 shrink-0"
              priority
            />
            <div className="min-w-0 leading-none">
              <div className="inline-flex max-w-full flex-col">
                <p className="truncate text-sm font-bold uppercase tracking-[0.06em] text-[#0B1F3A]">Requirement System</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">TI</p>
                  <span className="h-px min-w-10 flex-1 bg-primary/35" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 w-full max-w-xl md:flex-none">
          <CommandPalette items={commandItems} />
        </div>

        <div className="hidden items-center rounded-[2px] border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground xl:inline-flex">
          Updated {lastUpdated}
        </div>
        <UserMenu user={sessionUser} />
      </div>

      <div className="mx-auto hidden w-full max-w-[1760px] px-3 pb-2.5 md:block sm:px-4">
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto rounded-[2px] border border-border bg-muted/40 px-2 py-1.5 [scrollbar-width:thin]">
          {navLinks.map((link) => {
            const active = isNavActive(pathname, link.href);
            const showBadge = link.href === "/notifications" && unread > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "top-nav-pill inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 text-xs font-medium transition-colors no-underline",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
                )}
              >
                <MainNavIcon iconKey={link.iconKey} className="h-3.5 w-3.5 shrink-0 opacity-90" />
                <span>{link.label}</span>
                {showBadge ? (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
