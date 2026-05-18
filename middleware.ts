import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthProviderKind } from "@/lib/postgres/env";
import { isAuthMiddlewareEnabled, isSupabaseConfigured } from "@/lib/supabase/env";
import { REQUIREMENT_DETAIL_PREFIX } from "@/lib/routes/requirements";

const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/_next", "/favicon.ico", "/api/health"];

/** URLs antiguas `/requirements/{id}` → canónico `/requirements/id/{id}` (excluye kanban y prefijo nuevo). */
function redirectLegacyRequirementDetail(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const m = /^\/requirements\/([^/]+)$/.exec(pathname);
  if (!m) return null;
  const seg = m[1];
  if (seg === "kanban" || seg === "id") return null;
  const next = request.nextUrl.clone();
  next.pathname = `${REQUIREMENT_DETAIL_PREFIX}/${encodeURIComponent(seg)}`;
  return NextResponse.redirect(next, 308);
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/logout")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/session")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const legacy = redirectLegacyRequirementDetail(request);
  if (legacy) return legacy;

  const { pathname } = request.nextUrl;

  if (getAuthProviderKind() === "authjs") {
    if (!isAuthMiddlewareEnabled()) {
      return NextResponse.next({ request });
    }
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    if (isPublicPath(pathname)) {
      if (token && pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next({ request });
    }
    if (!token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAuthMiddlewareEnabled()) {
    return response;
  }

  if (isPublicPath(pathname)) {
    if (user && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
