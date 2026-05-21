"use client";

import { BarChart3, Bell, CalendarDays, Clock3, LayoutDashboard, ListTodo, MessageSquare, Settings, Users, Wallet } from "lucide-react";
import type { MainNavIconKey } from "@/components/layout/nav-links";

const ICONS: Record<MainNavIconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  requirements: ListTodo,
  clock: Clock3,
  calendar: CalendarDays,
  report: BarChart3,
  wallet: Wallet,
  users: Users,
  settings: Settings,
  bell: Bell,
  chat: MessageSquare,
};

export function MainNavIcon({ iconKey, className }: { iconKey: MainNavIconKey; className?: string }) {
  const Icon = ICONS[iconKey];
  return <Icon className={className ?? "h-4 w-4 shrink-0 opacity-90"} aria-hidden />;
}
