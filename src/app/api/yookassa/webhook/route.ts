import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserRowExists } from "@/lib/supabase/ensure-user-row";
import { isUuid } from "@/lib/submission-validation";
import type { SubscriptionTier } from "@/lib/types";
import { getYooKassaPayment, isYooKassaConfigured } from "@/lib/yookassa";

export const runtime = "nodejs";

type YooKassaWebhookBody = {
  event?: string;
  object?: {
    id?: string;
  };
};

const isMissingTierColumnError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("subscription_tier") && normalized.includes("column");
};

const isMissingUsersTableError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("could not find the table") && normalized.includes("public.users");
};

const isMissingPromoTableError = (message: string | undefined) => {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("could not find the table") &&
    (normalized.includes("public.promo_codes") || normalized.includes("public.promo_code_redemptions"))
  );
};

const isDuplicateRedemptionError = (message: string | undefined) => {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("duplicate key") || normalized.includes("unique constraint");
};

const normalizeTier = (value: unknown): SubscriptionTier => {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (raw === "max") {
    return "max";
  }

  if (raw === "start") {
    return "start";
  }

  return "newbie";
};

const resolveNextTier = (currentTier: SubscriptionTier, paidPlan: "start" | "max") => {
  if (currentTier === "max") {
    return "max";
  }

  return paidPlan === "max" ? "max" : "start";
};

const toDiscountRub = (value: string | undefined) => {
  const parsed = Number(value?.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "0.00";
  }
  return parsed.toFixed(2);
};

const trackPromoRedemption = async ({
  admin,
  userId,
  paymentId,
  paymentAmountRub,
  paidPlan,
  promoCodeId,
  discountRub,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  paymentId: string;
  paymentAmountRub: string;
  paidPlan: "start" | "max";
  promoCodeId: string | undefined;
  discountRub: string;
}) => {
  if (!promoCodeId || !isUuid(promoCodeId)) {
    return;
  }

  const existingRedemption = await admin
    .from("promo_code_redemptions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingRedemption.error) {
    if (isMissingPromoTableError(existingRedemption.error.message)) {
      return;
    }

    console.error("[yookassa:webhook] promo_code_redemptions select error", existingRedemption.error.message);
    return;
  }

  if (existingRedemption.data?.id) {
    return;
  }

  const insertRedemption = await admin.from("promo_code_redemptions").insert({
    promo_code_id: promoCodeId,
    user_id: userId,
    payment_id: paymentId,
    plan_id: paidPlan,
    payment_amount_rub: paymentAmountRub,
    discount_rub: discountRub,
  });

  if (insertRedemption.error) {
    if (
      isDuplicateRedemptionError(insertRedemption.error.message) ||
      isMissingPromoTableError(insertRedemption.error.message)
    ) {
      return;
    }

    console.error("[yookassa:webhook] promo_code_redemptions insert error", insertRedemption.error.message);
    return;
  }

  const promoRowResult = await admin
    .from("promo_codes")
    .select("used_count")
    .eq("id", promoCodeId)
    .maybeSingle();

  if (promoRowResult.error) {
    if (isMissingPromoTableError(promoRowResult.error.message)) {
      return;
    }

    console.error("[yookassa:webhook] promo_codes select error", promoRowResult.error.message);
    return;
  }

  const currentUsed = promoRowResult.data?.used_count ?? 0;
  const nextUsed = Number.isFinite(currentUsed) ? currentUsed + 1 : 1;

  const updatePromoResult = await admin
    .from("promo_codes")
    .update({ used_count: nextUsed })
    .eq("id", promoCodeId);

  if (updatePromoResult.error && !isMissingPromoTableError(updatePromoResult.error.message)) {
    console.error("[yookassa:webhook] promo_codes update error", updatePromoResult.error.message);
  }
};

export async function POST(request: Request) {
  if (!isYooKassaConfigured()) {
    return NextResponse.json(
      { error: "ЮKassa не настроена в окружении сервера." },
      { status: 500 },
    );
  }

  let payload: YooKassaWebhookBody;
  try {
    payload = (await request.json()) as YooKassaWebhookBody;
  } catch {
    return NextResponse.json({ error: "Некорректный формат webhook." }, { status: 400 });
  }

  if (payload.event !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentId = payload.object?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "Отсутствует идентификатор платежа." }, { status: 400 });
  }

  try {
    const payment = await getYooKassaPayment(paymentId);
    if (payment.status !== "succeeded" || !payment.paid) {
      return NextResponse.json({ error: "Платеж еще не подтвержден." }, { status: 400 });
    }

    const userId = payment.metadata?.user_id;
    if (!userId) {
      return NextResponse.json({ error: "В метаданных платежа нет user_id." }, { status: 400 });
    }

    const paidPlan = payment.metadata?.plan_id === "max" ? "max" : "start";
    const admin = createAdminClient();

    const authUserResult = await admin.auth.admin.getUserById(userId);
    if (authUserResult.error || !authUserResult.data.user) {
      return NextResponse.json({ error: "Пользователь не найден в Auth." }, { status: 404 });
    }

    const authUser = authUserResult.data.user;
    const authTier = normalizeTier(authUser.user_metadata?.subscription_tier);
    const authIsPro = authUser.user_metadata?.is_pro === true;

    const { data: existingUser } = await admin
      .from("users")
      .select("subscription_tier, is_pro")
      .eq("id", userId)
      .maybeSingle();

    const dbTier = normalizeTier(existingUser?.subscription_tier);
    const dbIsPro = existingUser?.is_pro === true;

    const currentTier: SubscriptionTier =
      authIsPro || dbIsPro || authTier === "max" || dbTier === "max"
        ? "max"
        : authTier === "start" || dbTier === "start"
          ? "start"
          : "newbie";

    const nextTier = resolveNextTier(currentTier, paidPlan);
    const grantMax = nextTier === "max";

    const updateAuthResult = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        subscription_tier: nextTier,
        is_pro: grantMax,
      },
    });

    if (updateAuthResult.error) {
      return NextResponse.json({ error: updateAuthResult.error.message }, { status: 500 });
    }

    const usersSyncError = await ensureUserRowExists(admin, {
      id: authUser.id,
      email: authUser.email ?? null,
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        subscription_tier: nextTier,
        is_pro: grantMax,
      },
      app_metadata: authUser.app_metadata ?? null,
    });

    if (usersSyncError && !isMissingUsersTableError(usersSyncError)) {
      if (isMissingTierColumnError(usersSyncError)) {
        const legacyUpsert = await admin.from("users").upsert(
          {
            id: userId,
            is_pro: grantMax,
          },
          { onConflict: "id", ignoreDuplicates: false },
        );

        if (legacyUpsert.error) {
          return NextResponse.json({ error: legacyUpsert.error.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: usersSyncError }, { status: 500 });
      }
    }

    await trackPromoRedemption({
      admin,
      userId,
      paymentId: payment.id,
      paymentAmountRub: payment.amount.value,
      paidPlan,
      promoCodeId: payment.metadata?.promo_code_id,
      discountRub: toDiscountRub(payment.metadata?.discount_rub),
    });

    return NextResponse.json({
      received: true,
      tier: nextTier,
      persisted: usersSyncError ? "auth_only" : "auth_and_users",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка webhook ЮKassa.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
