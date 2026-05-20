import {
  createChatChannel,
  createDirectChatThread,
  getChatMessages,
  getChatPresencePreferences,
  getChatThreadMembers,
  getChatThreadsForUser,
  getUsers,
  hideChatMessageForUser,
  hideChatThreadForUser,
  markChatThreadRead,
  unhideChatMessageForUser,
  unhideChatThreadForUser,
  sendChatMessage,
  touchChatPresenceHeartbeat,
  upsertChatPresencePreference,
} from "@/data/repositories/server-db";
import type { ChatMessage, ChatPresencePreference, ChatPresenceStatus, ChatThread, User } from "@/types/domain";

export type ChatThreadSummary = {
  thread: ChatThread;
  title: string;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  memberIds: string[];
};

export type ChatBootstrapPayload = {
  meUserId: string;
  users: User[];
  threads: ChatThreadSummary[];
  presence: ChatPresencePreference[];
};

export type ChatUnreadSummary = {
  totalUnread: number;
  alerts: Array<{
    threadId: string;
    threadTitle: string;
    unreadCount: number;
    lastMessageBody: string;
    lastMessageSenderName: string;
    lastMessageAt: string;
  }>;
};

function buildThreadTitle(thread: ChatThread, usersById: Map<string, User>, meUserId: string, memberIds: string[]): string {
  if (thread.type === "channel") return thread.name?.trim() || "Canal sin nombre";
  const peerId = memberIds.find((id) => id !== meUserId);
  const peer = peerId ? usersById.get(peerId) : null;
  return peer?.name ?? "Chat directo";
}

export async function loadChatBootstrap(meUserId: string): Promise<ChatBootstrapPayload> {
  const users = (await getUsers()).filter((u) => u.active);
  const usersById = new Map(users.map((u) => [u.id, u]));
  const threads = await getChatThreadsForUser(meUserId);
  const summaries: ChatThreadSummary[] = [];

  for (const thread of threads) {
    const members = await getChatThreadMembers(thread.id);
    const messages = await getChatMessages(thread.id, 120);
    const lastMessage = messages[messages.length - 1] ?? null;
    const meMember = members.find((m) => m.userId === meUserId);
    const lastReadId = meMember?.lastReadMessageId ?? null;
    const startIndex = lastReadId ? messages.findIndex((msg) => msg.id === lastReadId) : -1;
    const unreadCount = messages
      .slice(startIndex >= 0 ? startIndex + 1 : 0)
      .filter((msg) => msg.senderUserId !== meUserId).length;
    const memberIds = members.map((m) => m.userId);
    summaries.push({
      thread,
      title: buildThreadTitle(thread, usersById, meUserId, memberIds),
      lastMessage,
      unreadCount,
      memberIds,
    });
  }

  const usersInThreads = new Set<string>([meUserId]);
  for (const row of summaries) {
    for (const userId of row.memberIds) usersInThreads.add(userId);
  }
  const presence = await getChatPresencePreferences([...usersInThreads]);
  return { meUserId, users, threads: summaries, presence };
}

export async function createDirectThreadAndBootstrap(input: { meUserId: string; peerUserId: string }) {
  await createDirectChatThread({
    createdByUserId: input.meUserId,
    peerUserId: input.peerUserId,
  });
  return loadChatBootstrap(input.meUserId);
}

export async function createChannelAndBootstrap(input: {
  meUserId: string;
  name: string;
  memberUserIds: string[];
}) {
  await createChatChannel({
    createdByUserId: input.meUserId,
    name: input.name,
    memberUserIds: input.memberUserIds,
  });
  return loadChatBootstrap(input.meUserId);
}

export async function postChatMessage(input: { threadId: string; senderUserId: string; body: string }) {
  return sendChatMessage(input);
}

export async function listThreadMessages(input: { threadId: string; limit?: number; viewerUserId?: string }) {
  return getChatMessages(input.threadId, input.limit ?? 100, input.viewerUserId);
}

export async function hideMessageForUser(input: { messageId: string; userId: string }) {
  return hideChatMessageForUser(input);
}

export async function unhideMessageForUser(input: { messageId: string; userId: string }) {
  return unhideChatMessageForUser(input);
}

export async function hideThreadForUser(input: { threadId: string; userId: string }) {
  return hideChatThreadForUser(input);
}

export async function unhideThreadForUser(input: { threadId: string; userId: string }) {
  return unhideChatThreadForUser(input);
}

export async function markRead(input: { threadId: string; userId: string; lastReadMessageId: string | null }) {
  return markChatThreadRead(input);
}

export async function updatePresencePreference(input: {
  userId: string;
  status: ChatPresenceStatus;
  dndUntil: string | null;
  customStatus: string | null;
}) {
  return upsertChatPresencePreference(input);
}

export async function heartbeatPresence(userId: string) {
  return touchChatPresenceHeartbeat(userId);
}

export async function loadChatUnreadSummary(meUserId: string): Promise<ChatUnreadSummary> {
  const bootstrap = await loadChatBootstrap(meUserId);
  const usersById = new Map(bootstrap.users.map((u) => [u.id, u]));
  const alerts = bootstrap.threads
    .filter((thread) => thread.unreadCount > 0 && thread.lastMessage && thread.lastMessage.senderUserId !== meUserId)
    .map((thread) => ({
      threadId: thread.thread.id,
      threadTitle: thread.title,
      unreadCount: thread.unreadCount,
      lastMessageBody: thread.lastMessage?.body ?? "",
      lastMessageSenderName: usersById.get(thread.lastMessage?.senderUserId ?? "")?.name ?? "Nuevo mensaje",
      lastMessageAt: thread.lastMessage?.createdAt ?? "",
    }))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  const totalUnread = alerts.reduce((acc, item) => acc + item.unreadCount, 0);
  return { totalUnread, alerts: alerts.slice(0, 5) };
}
