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

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}

