import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { trackErrorEvent } from "@/lib/telemetry";

type Payload = {
  source?: "client" | "render";
  message?: string;
  stack?: string | null;
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
    bucket: "telemetry-errors",
    limit: 40,
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
    return NextResponse.json({ error: "Некорректный формат запроса." }, { status: 400 });
  }

  const message = sanitizeText(payload.message, 1500);
  if (!message) {
    return NextResponse.json({ error: "Не передано сообщение об ошибке." }, { status: 400 });
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

  await trackErrorEvent({
    source: payload.source === "render" ? "render" : "client",
    message,
    stack: sanitizeText(payload.stack, 4000),
    routePath: sanitizeText(payload.routePath, 300),
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


