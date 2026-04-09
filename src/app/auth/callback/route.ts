import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FALLBACK_REDIRECT = "/dashboard";

const resolveSafeNextPath = (value: string | null) => {
  if (!value) {
    return FALLBACK_REDIRECT;
  }

  if (!value.startsWith("/")) {
    return FALLBACK_REDIRECT;
  }

  if (value.startsWith("//")) {
    return FALLBACK_REDIRECT;
  }

  return value;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = resolveSafeNextPath(requestUrl.searchParams.get("next"));

  console.info("[auth/callback] hit", requestUrl.toString());
  console.info("[auth/callback] nextPath", nextPath);

  if (!code) {
    console.error("[auth/callback] no code in callback URL");
    return NextResponse.redirect(new URL("/auth?error=no_code", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(new URL("/auth?error=exchange_failed", requestUrl.origin));
  }

  console.info("[auth/callback] exchange success, redirecting", nextPath);
  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
