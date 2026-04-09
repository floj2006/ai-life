import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  calculateDiscountedAmount,
  isPromoApplicableToPlan,
  isPromoCodeFormatValid,
  normalizePromoCode,
  toPromoDiscountValue,
  validatePromoAvailability,
  type PromoCodeRecord,
} from "@/lib/promo-codes";
import {
  DEFAULT_PAID_PLAN,
  isPaidPlanId,
  paidPlanById,
  type PaidPlanId,
} from "@/lib/pricing";
import { createYooKassaPayment, isYooKassaConfigured } from "@/lib/yookassa";

export const runtime = "nodejs";

type CheckoutPayload = {
  plan?: string;
  promoCode?: string;
};

type PromoCodeDbRow = PromoCodeRecord;

const isMissingPromoCodesTableError = (message: string | undefined) => {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("could not find the table") && normalized.includes("public.promo_codes");
};

const toMoneyNumber = (rawValue: string | undefined, envName: string) => {
  const value = rawValue ?? "";
  const normalized = Number(value.replace(",", "."));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${envName} must be a positive number`);
  }

  return normalized;
};

const shouldUseEnvPlanAmounts = () => {
  return process.env.YOOKASSA_USE_ENV_AMOUNTS === "true";
};

const getPlanAmountRub = (plan: PaidPlanId) => {
  const planPriceRub = paidPlanById[plan].priceRub;
  if (!shouldUseEnvPlanAmounts()) {
    return planPriceRub;
  }

  try {
    if (plan === "start") {
      return toMoneyNumber(process.env.YOOKASSA_START_AMOUNT_RUB, "YOOKASSA_START_AMOUNT_RUB");
    }

    return toMoneyNumber(process.env.YOOKASSA_MAX_AMOUNT_RUB, "YOOKASSA_MAX_AMOUNT_RUB");
  } catch {
    return planPriceRub;
  }
};

const parsePayload = async (request: Request) => {
  try {
    const body = (await request.json()) as CheckoutPayload;
    const plan = isPaidPlanId(body.plan) ? body.plan : DEFAULT_PAID_PLAN;
    const promoCode = normalizePromoCode(body.promoCode);
    return { plan, promoCode };
  } catch {
    return { plan: DEFAULT_PAID_PLAN as PaidPlanId, promoCode: "" };
  }
};

const applyPromoIfNeeded = async ({
  plan,
  promoCode,
  baseAmountRub,
}: {
  plan: PaidPlanId;
  promoCode: string;
  baseAmountRub: number;
}) => {
  if (!promoCode) {
    return {
      finalAmountValue: baseAmountRub.toFixed(2),
      discountValue: "0.00",
      promo: null as null | PromoCodeDbRow,
    };
  }

  if (!isPromoCodeFormatValid(promoCode)) {
    return { error: "Формат промокода некорректный." };
  }

  const admin = createAdminClient();
  const { data: promo, error } = await admin
    .from("promo_codes")
    .select(
      "id, code, title, discount_type, discount_value, plan_scope, is_active, max_uses, used_count, starts_at, expires_at",
    )
    .eq("code", promoCode)
    .maybeSingle();

  if (error) {
    if (isMissingPromoCodesTableError(error.message)) {
      return { error: "Промокоды временно недоступны. Попробуйте оплату без промокода." };
    }

    return { error: error.message };
  }

  if (!promo) {
    return { error: "Промокод не найден." };
  }

  if (!isPromoApplicableToPlan(promo, plan)) {
    return {
      error:
        promo.plan_scope === "start"
          ? "Этот промокод действует только на тариф Старт."
          : promo.plan_scope === "max"
            ? "Этот промокод действует только на тариф Макс."
            : "Этот промокод не подходит для выбранного тарифа.",
    };
  }

  const availability = validatePromoAvailability(promo);
  if (!availability.ok) {
    return { error: availability.error };
  }

  const discountValue = toPromoDiscountValue(promo.discount_value);
  if (!discountValue) {
    return { error: "Промокод настроен некорректно." };
  }

  const calculation = calculateDiscountedAmount({
    baseAmountRub,
    discountType: promo.discount_type,
    discountValue,
  });

  return {
    finalAmountValue: calculation.finalAmountValue,
    discountValue: calculation.discountValue,
    promo,
  };
};

export async function POST(request: Request) {
  if (!isYooKassaConfigured()) {
    return NextResponse.json(
      { error: "ЮKassa не настроена: добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация." }, { status: 401 });
  }

  const { plan, promoCode } = await parsePayload(request);
  const selectedPlan = paidPlanById[plan];
  const baseAmountRub = getPlanAmountRub(plan);

  const promoResult = await applyPromoIfNeeded({
    plan,
    promoCode,
    baseAmountRub,
  });

  if ("error" in promoResult) {
    return NextResponse.json({ error: promoResult.error }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const returnUrl = `${appUrl}/success`;

  try {
    const payment = await createYooKassaPayment({
      amountValue: promoResult.finalAmountValue,
      returnUrl,
      description: `AI Easy Life ${selectedPlan.title}`,
      userId: user.id,
      email: user.email ?? undefined,
      planId: plan,
      promoCodeId: promoResult.promo?.id,
      promoCode: promoResult.promo?.code,
      discountRub: promoResult.discountValue,
      baseAmountRub: baseAmountRub.toFixed(2),
      finalAmountRub: promoResult.finalAmountValue,
    });

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return NextResponse.json(
        { error: "ЮKassa не вернула ссылку подтверждения платежа." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: confirmationUrl,
      totalRub: promoResult.finalAmountValue,
      discountRub: promoResult.discountValue,
      promoCode: promoResult.promo?.code ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания платежа в ЮKassa.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
