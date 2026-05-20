import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { hideMessageForUser, listThreadMessages, postChatMessage, unhideMessageForUser } from "@/lib/chat/service";
import { createAppNotification, getChatThreadMembers, getUsers } from "@/data/repositories/server-db";
import { sanitizeChatMessage } from "@/lib/chat/sanitize";

type Context = { params: Promise<{ threadId: string }> };

export async function GET(_req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.read");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para este chat." }, { status: 403 });
    }
    const messages = await listThreadMessages({ threadId, limit: 150, viewerUserId: meUserId });
    return NextResponse.json({ items: messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener mensajes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para este chat." }, { status: 403 });
    }
    const payload = (await req.json()) as { messageId?: string };
    const messageId = payload.messageId?.trim();
    if (!messageId) return NextResponse.json({ error: "messageId es obligatorio." }, { status: 400 });
    const messages = await listThreadMessages({ threadId, limit: 300 });
    const target = messages.find((row) => row.id === messageId);
    if (!target) return NextResponse.json({ error: "Mensaje no encontrado en esta conversación." }, { status: 404 });
    if (target.senderUserId !== meUserId) {
      return NextResponse.json({ error: "Solo puedes eliminar tus propios mensajes." }, { status: 403 });
    }
    await hideMessageForUser({ messageId: target.id, userId: meUserId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el mensaje.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para este chat." }, { status: 403 });
    }
    const payload = (await req.json()) as { messageId?: string };
    const messageId = payload.messageId?.trim();
    if (!messageId) return NextResponse.json({ error: "messageId es obligatorio." }, { status: 400 });
    const messages = await listThreadMessages({ threadId, limit: 300 });
    const target = messages.find((row) => row.id === messageId);
    if (!target) return NextResponse.json({ error: "Mensaje no encontrado en esta conversación." }, { status: 404 });
    if (target.senderUserId !== meUserId) {
      return NextResponse.json({ error: "Solo puedes restaurar tus propios mensajes." }, { status: 403 });
    }
    await unhideMessageForUser({ messageId: target.id, userId: meUserId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo restaurar el mensaje.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request, context: Context) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const { threadId } = await context.params;
    const members = await getChatThreadMembers(threadId);
    if (!members.some((m) => m.userId === meUserId)) {
      return NextResponse.json({ error: "No autorizado para este chat." }, { status: 403 });
    }
    const payload = (await req.json()) as { body?: string };
    const body = sanitizeChatMessage(payload.body ?? "");
    if (!body) return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
    const created = await postChatMessage({ threadId, senderUserId: meUserId, body });
    const users = await getUsers();
    const senderName = users.find((u) => u.id === meUserId)?.name ?? "Usuario";
    const recipients = members.filter((m) => m.userId !== meUserId);
    await Promise.all(
      recipients.map((recipient) =>
        createAppNotification({
          recipientUserId: recipient.userId,
          title: `Nuevo mensaje de ${senderName}`,
          body: body.length > 120 ? `${body.slice(0, 117)}...` : body,
          href: `/chat?thread=${encodeURIComponent(threadId)}`,
        }),
      ),
    );
    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
