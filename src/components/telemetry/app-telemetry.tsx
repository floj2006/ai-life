"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackClientError, trackClientEvent } from "@/lib/telemetry-client";

export function AppTelemetry() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string>("");

  useEffect(() => {
    const routePath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (lastTrackedPathRef.current === routePath) {
      return;
    }

    lastTrackedPathRef.current = routePath;
    trackClientEvent("page_view", {
      pathname,
      search: searchParams.toString() || null,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      trackClientError({
        source: "client",
        message: event.message || "Unknown client error",
        stack: event.error instanceof Error ? event.error.stack ?? null : null,
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "Unhandled promise rejection";

      trackClientError({
        source: "client",
        message: reason,
        stack: event.reason instanceof Error ? event.reason.stack ?? null : null,
        metadata: {
          unhandledRejection: true,
        },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
