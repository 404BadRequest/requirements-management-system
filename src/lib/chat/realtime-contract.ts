import type { ChatPresenceStatus } from "@/types/domain";

export const CHAT_SOCKET_EVENTS = {
  THREAD_JOIN: "chat:thread:join",
  MESSAGE_SEND: "chat:message:send",
  MESSAGE_READ: "chat:message:read",
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_HEARTBEAT: "presence:heartbeat",
} as const;

export type ChatSocketEventName = (typeof CHAT_SOCKET_EVENTS)[keyof typeof CHAT_SOCKET_EVENTS];

export type PresenceSnapshot = {
  userId: string;
  status: ChatPresenceStatus;
  lastSeenAt: string;
};

export interface PresenceStore {
  get(userId: string): Promise<PresenceSnapshot | null>;
  upsert(snapshot: PresenceSnapshot): Promise<void>;
  getMany(userIds: string[]): Promise<PresenceSnapshot[]>;
}

const memoryPresence = new Map<string, PresenceSnapshot>();

/**
 * Fallback de desarrollo.
 * En producción se reemplaza por un adapter Redis compatible con la interfaz PresenceStore.
 */
export const memoryPresenceStore: PresenceStore = {
  async get(userId) {
    return memoryPresence.get(userId) ?? null;
  },
  async upsert(snapshot) {
    memoryPresence.set(snapshot.userId, snapshot);
  },
  async getMany(userIds) {
    return userIds.map((id) => memoryPresence.get(id)).filter((row): row is PresenceSnapshot => Boolean(row));
  },
};
