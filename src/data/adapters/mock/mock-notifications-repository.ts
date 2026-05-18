import type { CreateAppNotificationInput, NotificationsRepository } from "@/data/contracts/notifications-contract";
import type { AppNotification } from "@/types/domain";

const store: AppNotification[] = [];

export class MockNotificationsRepository implements NotificationsRepository {
  async listForUser(recipientUserId: string): Promise<AppNotification[]> {
    return [...store]
      .filter((n) => n.recipientUserId === recipientUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async unreadCountForUser(recipientUserId: string): Promise<number> {
    return store.filter((n) => n.recipientUserId === recipientUserId && !n.readAt).length;
  }

  async create(input: CreateAppNotificationInput): Promise<AppNotification> {
    const now = new Date().toISOString();
    const n: AppNotification = {
      id: `notif-${crypto.randomUUID().slice(0, 12)}`,
      recipientUserId: input.recipientUserId,
      title: input.title,
      body: input.body,
      href: input.href,
      readAt: null,
      createdAt: now,
    };
    store.unshift(n);
    return n;
  }

  async markRead(notificationId: string, recipientUserId: string): Promise<boolean> {
    const item = store.find((x) => x.id === notificationId && x.recipientUserId === recipientUserId);
    if (!item || item.readAt) return false;
    item.readAt = new Date().toISOString();
    return true;
  }
}
