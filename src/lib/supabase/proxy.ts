import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/http-security";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const isProtectedRoute = (pathname: string) => {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/quick-actions") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/success") ||
    pathname.startsWith("/api/progress") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/yookassa/checkout")
  );
};

export const updateSession = async (request: NextRequest) => {
  const env = getSupabasePublicEnv();
  const pathname = request.nextUrl.pathname;

  if (!env) {
    // In edge/runtime env may be unavailable even when server routes are configured.
    // Avoid false redirects to /setup here and let server routes/pages validate env.
    return applySecurityHeaders(NextResponse.next({ request }), pathname);
  }

  const { url, anonKey } = env;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = "/auth";
    return applySecurityHeaders(NextResponse.redirect(target), pathname);
  }

  if (user && request.nextUrl.pathname === "/auth") {
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard";
    return applySecurityHeaders(NextResponse.redirect(target), pathname);
  }

  return applySecurityHeaders(supabaseResponse, pathname);
};
