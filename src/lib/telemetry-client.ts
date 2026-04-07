"use client";

type JsonRecord = Record<string, unknown>;

const SESSION_KEY = "ai-easy-life-session-id";

const getSessionId = () => {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
};

const sendJson = (url: string, payload: JsonRecord) => {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    const queued = navigator.sendBeacon(url, blob);
    if (queued) {
      return;
    }
  }

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
};

export const trackClientEvent = (eventName: string, metadata: JsonRecord = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  sendJson("/api/telemetry/events", {
    eventName,
    routePath: `${window.location.pathname}${window.location.search}`,
    sessionId: getSessionId(),
    metadata,
  });
};

export const trackClientError = ({
  message,
  stack,
  metadata = {},
  source = "client",
}: {
  message: string;
  stack?: string | null;
  metadata?: JsonRecord;
  source?: "client" | "render";
}) => {
  if (typeof window === "undefined") {
    return;
  }

  sendJson("/api/telemetry/errors", {
    source,
    message,
    stack,
    routePath: `${window.location.pathname}${window.location.search}`,
    sessionId: getSessionId(),
    metadata,
  });
};
