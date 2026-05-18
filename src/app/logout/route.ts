import { NextResponse } from "next/server";
import { signOut } from "@/auth";
import { getAuthProviderKind } from "@/lib/postgres/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (getAuthProviderKind() === "authjs") {
    await signOut({ redirect: false });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
