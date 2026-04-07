import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { trackAnalyticsEvent } from "@/lib/telemetry";

type Payload = {
  eventName?: string;
  routePath?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

const sanitizeText = (value: unknown, limit: number) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, limit) : null;
};

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit({
    bucket: "telemetry-events",
    limit: 200,
    windowMs: 10 * 60 * 1000,
    request,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = sanitizeText(payload.eventName, 120);
  const routePath = sanitizeText(payload.routePath, 300);

  if (!eventName) {
    return NextResponse.json({ error: "Missing event name" }, { status: 400 });
  }

  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    userEmail = user?.email ?? null;
  } catch {
    userId = null;
    userEmail = null;
  }

  await trackAnalyticsEvent({
    eventName,
    routePath,
    request,
    userId,
    userEmail,
    metadata: {
      ...(payload.metadata ?? {}),
      sessionId: sanitizeText(payload.sessionId, 120),
    },
  });

  return NextResponse.json({ ok: true });
}
