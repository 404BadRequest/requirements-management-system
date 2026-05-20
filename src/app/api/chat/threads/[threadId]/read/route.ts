import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { markRead } from "@/lib/chat/service";
import { getChatThreadMembers } from "@/data/repositories/server-db";

type Context = { params: Promise<{ threadId: string }> };

export async function POST(req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para este chat." }, { status: 403 });
    }
    const payload = (await req.json()) as { lastReadMessageId?: string | null };
    await markRead({ threadId, userId: meUserId, lastReadMessageId: payload.lastReadMessageId ?? null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo marcar leído.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
