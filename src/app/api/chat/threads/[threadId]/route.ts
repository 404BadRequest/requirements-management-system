import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { getChatThreadMembers } from "@/data/repositories/server-db";
import { hideThreadForUser, unhideThreadForUser } from "@/lib/chat/service";

type Context = { params: Promise<{ threadId: string }> };

export async function DELETE(_req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para esta conversación." }, { status: 403 });
    }
    await hideThreadForUser({ threadId, userId: meUserId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la conversación.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(_req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para esta conversación." }, { status: 403 });
    }
    await unhideThreadForUser({ threadId, userId: meUserId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo restaurar la conversación.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
