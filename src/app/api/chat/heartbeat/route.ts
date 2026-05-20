import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { heartbeatPresence } from "@/lib/chat/service";

export async function POST() {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const updated = await heartbeatPresence(meUserId);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar heartbeat.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
