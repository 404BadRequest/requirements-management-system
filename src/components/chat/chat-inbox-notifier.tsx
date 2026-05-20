"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ChatUnreadSummary } from "@/lib/chat/service";

type ChatInboxNotifierProps = {
  enabled: boolean;
  onUnreadCountChange: (value: number) => void;
};

export function ChatInboxNotifier({ enabled, onUnreadCountChange }: ChatInboxNotifierProps) {
  const pathname = usePathname();
  const router = useRouter();
  const lastCountRef = useRef<number | null>(null);
  const firstLoadRef = useRef(true);
  const pollingAllowed = useMemo(() => enabled && !pathname.startsWith("/chat"), [enabled, pathname]);

  useEffect(() => {
    if (!enabled) {
      onUnreadCountChange(0);
      return;
    }
    let cancelled = false;
    const sync = async () => {
      const res = await fetch("/api/chat/unread-summary", { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as ChatUnreadSummary;
      if (cancelled) return;
      onUnreadCountChange(payload.totalUnread);

      const prev = lastCountRef.current;
      lastCountRef.current = payload.totalUnread;
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        return;
      }
      if (prev !== null && payload.totalUnread > prev && pollingAllowed) {
        const alert = payload.alerts[0];
        if (!alert) return;
        toast.info(`Nuevo mensaje de ${alert.lastMessageSenderName}`, {
          description: `${alert.threadTitle}: ${alert.lastMessageBody}`,
          action: {
            label: "Abrir chat",
            onClick: () => router.push(`/chat?thread=${encodeURIComponent(alert.threadId)}`),
          },
        });
      }
    };

    void sync();
    const id = window.setInterval(() => void sync(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, onUnreadCountChange, pollingAllowed, router]);

  return null;
}
