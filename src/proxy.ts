import { NextResponse, type NextRequest } from "next/server";
import { containsSqlMeta, findSqlMetaInParams } from "@/lib/submission-validation";
import { logSqlInjectionAttempt } from "@/lib/security/sql-injection-guard";
import { updateSession } from "@/lib/supabase/proxy";

const isSqlGuardedPath = (pathname: string) => {
  if (pathname.startsWith("/api/")) {
    return true;
  }

  return pathname.startsWith("/dashboard") ||
    pathname.startsWith("/submissions") ||
    pathname.startsWith("/admin");
};

const collectSuspiciousInput = (request: NextRequest) => {
  const params: Record<string, string> = {};

  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const paramMatch = findSqlMetaInParams(params);
  if (paramMatch) {
    return {
      source: "query",
      key: paramMatch.key,
      value: paramMatch.value,
    };
  }

  const pathMatch = request.nextUrl.pathname
    .split("/")
    .find((segment) => containsSqlMeta(segment));

  if (pathMatch) {
    return {
      source: "path",
      key: "path",
      value: pathMatch,
    };
  }

  return null;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSqlGuardedPath(pathname)) {
    const suspicious = collectSuspiciousInput(request);

    if (suspicious) {
      void logSqlInjectionAttempt({
        request,
        location: `${suspicious.source}:${suspicious.key}`,
        sample: suspicious.value,
      });

      return NextResponse.json(
        { error: "Запрос заблокирован системой безопасности." },
        { status: 400 },
      );
    }
  }

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
