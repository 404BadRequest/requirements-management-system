import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authenticateAuthJsCredentials } from "@/lib/auth/authjs-identities";
import { getAuthProviderKind } from "@/lib/postgres/env";
import type { Role } from "@/types/domain";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function normalizeRole(value: unknown): Role {
  const allowed: Role[] = ["Admin", "Project Manager", "Contributor", "Viewer"];
  return allowed.includes(value as Role) ? (value as Role) : "Viewer";
}

function resolveAuthSecret(): string | undefined {
  if (process.env.AUTH_SECRET?.trim()) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== "production") {
    // Evita bloquear entorno local cuando aún no se configuró AUTH_SECRET.
    return "dev-only-auth-secret-change-in-production";
  }
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: resolveAuthSecret(),
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        if (getAuthProviderKind() !== "authjs") return null;
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const identity = await authenticateAuthJsCredentials(parsed.data.email, parsed.data.password);
        if (!identity) return null;
        return {
          id: identity.userId,
          email: identity.email,
          name: identity.displayName,
          role: identity.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = normalizeRole((user as { role?: unknown }).role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: Role }).id = token.sub ?? "";
        (session.user as { id?: string; role?: Role }).role = normalizeRole(token.role);
      }
      return session;
    },
  },
});
