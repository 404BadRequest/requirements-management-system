import type { AppNotification } from "@/types/domain";

export type CreateAppNotificationInput = {
  recipientUserId: string;
  title: string;
  body: string;
  href: string | null;
};

export interface NotificationsRepository {
  listForUser(recipientUserId: string): Promise<AppNotification[]>;
  unreadCountForUser(recipientUserId: string): Promise<number>;
  create(input: CreateAppNotificationInput): Promise<AppNotification>;
  markRead(notificationId: string, recipientUserId: string): Promise<boolean>;
}
