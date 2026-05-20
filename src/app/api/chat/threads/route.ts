import { NextResponse } from "next/server";
import { requireChatSession } from "@/app/chat/chat-auth";
import { createChannelAndBootstrap, createDirectThreadAndBootstrap } from "@/lib/chat/service";

type CreateThreadPayload =
  | { mode: "direct"; peerUserId: string }
  | { mode: "channel"; name: string; memberUserIds: string[] };

export async function POST(req: Request) {
  try {
    const { meUserId } = await requireChatSession("chat.write");
    const payload = (await req.json()) as CreateThreadPayload;

    if (payload.mode === "direct") {
      if (!payload.peerUserId?.trim()) {
        return NextResponse.json({ error: "Debes seleccionar un usuario." }, { status: 400 });
      }
      const data = await createDirectThreadAndBootstrap({ meUserId, peerUserId: payload.peerUserId });
      return NextResponse.json(data);
    }

    const name = payload.name?.trim();
    if (!name) return NextResponse.json({ error: "El nombre del canal es obligatorio." }, { status: 400 });
    const memberUserIds = payload.memberUserIds ?? [];
    const data = await createChannelAndBootstrap({ meUserId, name, memberUserIds });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el chat.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
