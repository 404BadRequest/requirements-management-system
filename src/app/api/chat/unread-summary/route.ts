import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { loadChatUnreadSummary } from "@/lib/chat/service";

export async function GET() {
  try {
    const { meUserId } = await requireChatSession("chat.read");
    const summary = await loadChatUnreadSummary(meUserId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener resumen de no leídos.";
    return NextResponse.json({ error: message, totalUnread: 0, alerts: [] }, { status: 403 });
  }
}
