import type { NextResponse } from "next/server";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const isSensitivePath = (pathname: string) => {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/submissions") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/success") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/quick-actions") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/")
  );
};

export const applySecurityHeaders = (response: NextResponse, pathname: string) => {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  if (isSensitivePath(pathname)) {
    response.headers.set("Cache-Control", "no-store, private, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
};
