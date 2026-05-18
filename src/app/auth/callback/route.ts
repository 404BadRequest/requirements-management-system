import { NextResponse } from "next/server";
import { getAuthProviderKind } from "@/lib/postgres/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";

  if (getAuthProviderKind() === "authjs") {
    return NextResponse.redirect(new URL(next, origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
