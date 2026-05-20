import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { loadChatBootstrap } from "@/lib/chat/service";

export async function GET() {
  try {
    const { meUserId } = await requireChatSession("chat.read");
    const payload = await loadChatBootstrap(meUserId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el chat.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
