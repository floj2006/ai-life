import type { PaidPlanId } from "@/lib/pricing";

export type PromoDiscountType = "percent" | "fixed_rub";
export type PromoPlanScope = "all" | PaidPlanId;

export type PromoCodeRecord = {
  id: string;
  code: string;
  title: string | null;
  discount_type: PromoDiscountType;
  discount_value: number | string;
  plan_scope: PromoPlanScope;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  created_at?: string | null;
};

const PROMO_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const MIN_PAYMENT_RUB = 1;

export const normalizePromoCode = (value: string | undefined | null) => {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
};

export const isPromoCodeFormatValid = (value: string) => {
  return PROMO_CODE_RE.test(value);
};

export const toPromoDiscountValue = (value: number | string) => {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const isPromoApplicableToPlan = (promo: PromoCodeRecord, plan: PaidPlanId) => {
  return promo.plan_scope === "all" || promo.plan_scope === plan;
};

export const validatePromoAvailability = (promo: PromoCodeRecord, now = new Date()) => {
  if (!promo.is_active) {
    return { ok: false as const, error: "Промокод отключен." };
  }

  const startsAt = promo.starts_at ? new Date(promo.starts_at) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now) {
    return { ok: false as const, error: "Промокод ещё не активен." };
  }

  const expiresAt = promo.expires_at ? new Date(promo.expires_at) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
    return { ok: false as const, error: "Срок действия промокода истёк." };
  }

  if (
    typeof promo.max_uses === "number" &&
    promo.max_uses > 0 &&
    promo.used_count >= promo.max_uses
  ) {
    return { ok: false as const, error: "Лимит использования промокода исчерпан." };
  }

  return { ok: true as const };
};

const toWholeRub = (value: number) => Math.round(value);

const toMoney = (value: number) => {
  return Number(value.toFixed(2));
};

export const calculateDiscountedAmount = ({
  baseAmountRub,
  discountType,
  discountValue,
}: {
  baseAmountRub: number;
  discountType: PromoDiscountType;
  discountValue: number;
}) => {
  const safeBaseAmount = Math.max(MIN_PAYMENT_RUB, toWholeRub(baseAmountRub));

  const rawDiscountRub =
    discountType === "percent"
      ? toWholeRub((safeBaseAmount * discountValue) / 100)
      : toWholeRub(discountValue);

  const maxDiscountRub = Math.max(0, safeBaseAmount - MIN_PAYMENT_RUB);
  const discountRub = Math.max(0, Math.min(maxDiscountRub, rawDiscountRub));
  const finalAmountRub = Math.max(MIN_PAYMENT_RUB, safeBaseAmount - discountRub);

  const normalizedBase = toMoney(safeBaseAmount);
  const normalizedFinal = toMoney(finalAmountRub);
  const normalizedDiscount = toMoney(discountRub);

  return {
    baseAmountRub: normalizedBase,
    finalAmountRub: normalizedFinal,
    discountRub: normalizedDiscount,
    finalAmountValue: normalizedFinal.toFixed(2),
    discountValue: normalizedDiscount.toFixed(2),
  };
};

export const formatPromoDiscountLabel = (
  discountType: PromoDiscountType,
  discountValue: number | string,
) => {
  const numeric = toPromoDiscountValue(discountValue);
  if (!numeric) {
    return "Скидка";
  }

  if (discountType === "percent") {
    return `-${numeric}%`;
  }

  return `-${Math.round(numeric)} ₽`;
};
