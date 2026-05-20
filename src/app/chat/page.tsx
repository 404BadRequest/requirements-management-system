import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { requireChatSession } from "@/app/chat/chat-auth";
import { loadChatBootstrap } from "@/lib/chat/service";
import { ChatPageClient } from "@/app/chat/chat-page-client";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const { meUserId } = await requireChatSession("chat.read");
  const { thread = "" } = await searchParams;
  const bootstrap = await loadChatBootstrap(meUserId);
  const initialThreadId = bootstrap.threads.some((row) => row.thread.id === thread) ? thread : "";
  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="Chat interno"
          description="Mensajería en tiempo real entre usuarios con estados de presencia, no molestar y lectura."
        />
        <ChatPageClient initialData={bootstrap} initialThreadId={initialThreadId} />
      </div>
    </AppShell>
  );
}
