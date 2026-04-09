import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { validateLessonOrSubmissionId } from "@/lib/submission-validation";
import { logAdminAuditEvent } from "@/lib/telemetry";
import { encryptOptional } from "@/lib/security/encryption";
import type { SubscriptionTier } from "@/lib/types";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

type Payload = {
  tier?: SubscriptionTier;
};

const isMissingTierColumnError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("subscription_tier") && normalized.includes("column");
};

const isMissingUsersTableError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("could not find the table") &&
    normalized.includes("public.users")
  );
};

const isValidTier = (value: string | undefined): value is SubscriptionTier => {
  return value === "newbie" || value === "start" || value === "max";
};

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация." }, { status: 401 });
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Недостаточно прав для изменения тарифа." }, { status: 403 });
  }

  const rateLimitResponse = enforceRateLimit({
    bucket: "admin-tier-update",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    request,
    userId: user.id,
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

  if (!isValidTier(payload.tier)) {
    return NextResponse.json({ error: "Указан неверный тариф." }, { status: 400 });
  }

  const { userId } = await context.params;
  if (!validateLessonOrSubmissionId(userId)) {
    return NextResponse.json({ error: "Некорректный идентификатор пользователя." }, { status: 400 });
  }

  const admin = createAdminClient();
  const grantMax = payload.tier === "max";

  const authUserResult = await admin.auth.admin.getUserById(userId);
  if (authUserResult.error || !authUserResult.data.user) {
    return NextResponse.json({ error: "Пользователь не найден в системе авторизации." }, { status: 404 });
  }

  const authUser = authUserResult.data.user;
  const previousTier =
    typeof authUser.user_metadata?.subscription_tier === "string"
      ? authUser.user_metadata.subscription_tier
      : authUser.user_metadata?.is_pro === true
        ? "max"
        : "newbie";
  const fullName = (authUser.user_metadata?.full_name as string | undefined) ?? null;
  const updateAuthTier = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(authUser.user_metadata ?? {}),
      subscription_tier: payload.tier,
      is_pro: grantMax,
    },
  });

  if (updateAuthTier.error) {
    return NextResponse.json({ error: updateAuthTier.error.message }, { status: 400 });
  }

  const withTier = await admin.from("users").upsert(
    {
      id: userId,
      email: encryptOptional(authUser.email ?? null),
      full_name: encryptOptional(fullName),
      is_pro: grantMax,
      subscription_tier: payload.tier,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  if (!withTier.error) {
    await logAdminAuditEvent({
      actorUserId: user.id,
      actorEmail: user.email ?? null,
      action: "user_tier_updated",
      targetUserId: userId,
      metadata: {
        previousTier,
        nextTier: payload.tier,
        persisted: "auth_and_users",
      },
    });
    return NextResponse.json({ ok: true, tier: payload.tier });
  }

  if (isMissingUsersTableError(withTier.error.message)) {
    await logAdminAuditEvent({
      actorUserId: user.id,
      actorEmail: user.email ?? null,
      action: "user_tier_updated",
      targetUserId: userId,
      metadata: {
        previousTier,
        nextTier: payload.tier,
        persisted: "auth_only",
      },
    });
    return NextResponse.json({ ok: true, tier: payload.tier, persisted: "auth_only" });
  }

  if (!isMissingTierColumnError(withTier.error.message)) {
    return NextResponse.json({ error: withTier.error.message }, { status: 400 });
  }

  const legacy = await admin.from("users").upsert(
    {
      id: userId,
      email: encryptOptional(authUser.email ?? null),
      full_name: encryptOptional(fullName),
      is_pro: grantMax,
    },
    { onConflict: "id", ignoreDuplicates: false },
  );

  if (legacy.error) {
    if (isMissingUsersTableError(legacy.error.message)) {
      await logAdminAuditEvent({
        actorUserId: user.id,
        actorEmail: user.email ?? null,
        action: "user_tier_updated",
        targetUserId: userId,
        metadata: {
          previousTier,
          nextTier: payload.tier,
          persisted: "auth_only",
        },
      });
      return NextResponse.json({ ok: true, tier: payload.tier, persisted: "auth_only" });
    }
    return NextResponse.json({ error: legacy.error.message }, { status: 400 });
  }

  await logAdminAuditEvent({
    actorUserId: user.id,
    actorEmail: user.email ?? null,
    action: "user_tier_updated",
    targetUserId: userId,
    metadata: {
      previousTier,
      nextTier: payload.tier,
      persisted: "users_legacy",
    },
  });

  return NextResponse.json({ ok: true, tier: payload.tier });
}

