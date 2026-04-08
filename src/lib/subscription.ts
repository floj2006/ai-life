import type { SubscriptionTier } from "@/lib/types";

export const normalizeSubscriptionTier = (
  rawTier: unknown,
  isPro: boolean | null | undefined,
): SubscriptionTier => {
  if (rawTier === "max" || rawTier === "start" || rawTier === "newbie") {
    return rawTier;
  }

  return isPro ? "max" : "newbie";
};

export const isMaxTier = (tier: SubscriptionTier) => tier === "max";

export const getTierLabel = (tier: SubscriptionTier) => {
  if (tier === "max") {
    return "Макс";
  }

  if (tier === "start") {
    return "Старт";
  }

  return "Новичок";
};

const TIER_ORDER: Record<SubscriptionTier, number> = {
  newbie: 0,
  start: 1,
  max: 2,
};

type LessonTierInput = {
  isPremium: boolean;
  sortOrder?: number | null;
  requiredTier?: unknown;
};

export const resolveLessonAccessTier = ({
  isPremium,
  sortOrder,
  requiredTier,
}: LessonTierInput): SubscriptionTier => {
  if (requiredTier === "newbie" || requiredTier === "start" || requiredTier === "max") {
    return requiredTier;
  }

  if (isPremium) {
    return "max";
  }

  if ((sortOrder ?? 0) <= 6) {
    return "newbie";
  }

  return "start";
};

export const canAccessLessonTier = (
  userTier: SubscriptionTier,
  lessonTier: SubscriptionTier,
) => {
  return TIER_ORDER[userTier] >= TIER_ORDER[lessonTier];
};
