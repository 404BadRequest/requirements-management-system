import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getAppSession();
  return NextResponse.json(session);
}
