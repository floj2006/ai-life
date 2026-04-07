import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  canAccessLessonTier,
  getTierLabel,
  normalizeSubscriptionTier,
  resolveLessonAccessTier,
} from "@/lib/subscription";

type ProgressPayload = {
  lessonId?: string;
  completed?: boolean;
};

type LessonAccessRow = {
  is_premium: boolean;
  sort_order: number | null;
};

type UserAccessRow = {
  is_pro: boolean | null;
  subscription_tier?: string | null;
};

const isMissingTierColumnError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("subscription_tier") && normalized.includes("column");
};

const getUserAccessRow = async (userId: string, supabase: Awaited<ReturnType<typeof createClient>>) => {
  const withTier = await supabase
    .from("users")
    .select("is_pro, subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (!withTier.error) {
    return withTier.data as UserAccessRow | null;
  }

  if (!isMissingTierColumnError(withTier.error.message)) {
    return null;
  }

  const legacy = await supabase
    .from("users")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();

  if (legacy.error) {
    return null;
  }

  return legacy.data as UserAccessRow | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit({
    bucket: "progress-update",
    limit: 40,
    windowMs: 5 * 60 * 1000,
    request,
    userId: user.id,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let payload: ProgressPayload;
  try {
    payload = (await request.json()) as ProgressPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.lessonId || typeof payload.completed !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [lessonResult, userAccess] = await Promise.all([
    supabase
      .from("lessons")
      .select("is_premium, sort_order")
      .eq("id", payload.lessonId)
      .maybeSingle(),
    getUserAccessRow(user.id, supabase),
  ]);

  if (lessonResult.error || !lessonResult.data) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const lesson = lessonResult.data as LessonAccessRow;
  const authTierRaw =
    typeof user.user_metadata?.subscription_tier === "string"
      ? user.user_metadata.subscription_tier
      : typeof user.app_metadata?.subscription_tier === "string"
        ? user.app_metadata.subscription_tier
        : undefined;
  const authIsPro =
    user.user_metadata?.is_pro === true || user.app_metadata?.is_pro === true;
  const tier = normalizeSubscriptionTier(
    userAccess?.subscription_tier ?? authTierRaw,
    userAccess?.is_pro ?? authIsPro,
  );
  const requiredTier = resolveLessonAccessTier({
    isPremium: lesson.is_premium,
    sortOrder: lesson.sort_order,
  });

  if (!canAccessLessonTier(tier, requiredTier)) {
    return NextResponse.json(
      { error: `Для этого урока нужен тариф ${getTierLabel(requiredTier)}.` },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("progress").upsert(
    {
      user_id: user.id,
      lesson_id: payload.lessonId,
      completed: payload.completed,
      completed_at: payload.completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,lesson_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
