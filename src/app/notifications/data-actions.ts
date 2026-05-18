"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import {
  getUsers,
  getNotificationsUnreadCountForUser,
  listNotificationsForUser,
  markNotificationReadForUser,
} from "@/data/repositories/server-db";

export async function loadNotificationsForSession() {
  const { user } = await getAppSession();
  assertPermission(user?.role, "notifications.read");
  if (!user) return { items: [], recipientId: "" as const };
  const users = await getUsers();
  const recipientId = resolveDirectoryUserIdForSession(user, users.filter((u) => u.active));
  const items = await listNotificationsForUser(recipientId);
  return { items, recipientId };
}

export async function getNotificationUnreadCountForSession(): Promise<number> {
  const { user } = await getAppSession();
  if (!user) return 0;
  try {
    assertPermission(user?.role, "notifications.read");
  } catch {
    return 0;
  }
  const users = await getUsers();
  const recipientId = resolveDirectoryUserIdForSession(user, users.filter((u) => u.active));
  return getNotificationsUnreadCountForUser(recipientId);
}

export async function markNotificationReadAction(notificationId: string) {
  const { user } = await getAppSession();
  assertPermission(user?.role, "notifications.read");
  if (!user) throw new Error("Sesión requerida.");
  const users = await getUsers();
  const recipientId = resolveDirectoryUserIdForSession(user, users.filter((u) => u.active));
  const ok = await markNotificationReadForUser(notificationId, recipientId);
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  return ok;
}

export async function markAllNotificationsReadAction(): Promise<number> {
  const { user } = await getAppSession();
  assertPermission(user?.role, "notifications.read");
  if (!user) throw new Error("Sesión requerida.");

  const users = await getUsers();
  const recipientId = resolveDirectoryUserIdForSession(user, users.filter((u) => u.active));
  const items = await listNotificationsForUser(recipientId);
  const unread = items.filter((item) => !item.readAt);
  if (unread.length === 0) return 0;

  const results = await Promise.all(unread.map((item) => markNotificationReadForUser(item.id, recipientId)));
  const markedCount = results.filter(Boolean).length;

  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  return markedCount;
}
