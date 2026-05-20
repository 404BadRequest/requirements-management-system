import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { updatePresencePreference } from "@/lib/chat/service";
import type { ChatPresenceStatus } from "@/types/domain";

const VALID: ChatPresenceStatus[] = ["online", "away", "dnd", "offline"];

export async function POST(req: Request) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const payload = (await req.json()) as {
      status?: ChatPresenceStatus;
      dndUntil?: string | null;
      customStatus?: string | null;
    };
    const status = payload.status;
    if (!status || !VALID.includes(status)) {
      return NextResponse.json({ error: "Estado de presencia inválido." }, { status: 400 });
    }
    const updated = await updatePresencePreference({
      userId: meUserId,
      status,
      dndUntil: payload.dndUntil ?? null,
      customStatus: payload.customStatus ?? null,
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la presencia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
