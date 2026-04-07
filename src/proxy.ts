import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/auth",
    "/reset-password",
    "/setup",
    "/dashboard/:path*",
    "/admin/:path*",
    "/quick-actions/:path*",
    "/billing/:path*",
    "/success/:path*",
    "/submissions/:path*",
    "/review/:path*",
    "/api/progress/:path*",
    "/api/admin/:path*",
    "/api/submissions/:path*",
    "/api/yookassa/checkout/:path*",
  ],
};
