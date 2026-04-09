import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { containsSqlMeta, findSqlMetaInParams } from "@/lib/submission-validation";
import { logSqlInjectionAttempt } from "@/lib/security/sql-injection-guard";

const isProtectedPath = (pathname: string) => {
  if (pathname.startsWith("/api/")) {
    return true;
  }
  return pathname.startsWith("/dashboard") ||
    pathname.startsWith("/submissions") ||
    pathname.startsWith("/admin");
};

const collectSuspiciousInput = (request: NextRequest) => {
  const url = new URL(request.url);
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
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

  const pathMatch = url.pathname.split("/").find((segment) => containsSqlMeta(segment));
  if (pathMatch) {
    return {
      source: "path",
      key: "path",
      value: pathMatch,
    };
  }

  return null;
};

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/submissions/:path*", "/admin/:path*"],
};
