"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getAuthProviderKind } from "@/lib/postgres/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard").trim() || "/dashboard";
  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Correo y contraseña son obligatorios.")}`);
  }
  if (getAuthProviderKind() === "authjs") {
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: next.startsWith("/") ? next : "/dashboard",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.type === "CredentialsSignin") {
          redirect(`/login?error=${encodeURIComponent("Credenciales inválidas.")}`);
        }
        redirect(`/login?error=${encodeURIComponent("No fue posible iniciar sesión. Intenta nuevamente.")}`);
      }
      throw error;
    }
    return;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`/login?error=${encodeURIComponent("Supabase no está configurado.")}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(next.startsWith("/") ? next : "/dashboard");
}
