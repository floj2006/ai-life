import { LESSONS_TOTAL } from "@/lib/lesson-stats";

export type PaidPlanId = "start" | "max";
export type PlanId = PaidPlanId;

export type Plan = {
  id: PlanId;
  title: string;
  subtitle: string;
  priceRub: number;
  priceLabel: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    id: "start",
    title: "Старт",
    subtitle: "Практика в Syntx AI каждый день",
    priceRub: 999,
    priceLabel: "999 ₽",
    features: [
      "Доступ к урокам уровня «Новичок» и «Старт»",
      "Практика в одном сервисе: Syntx AI",
      "Прогресс и задания в личном кабинете",
    ],
  },
  {
    id: "max",
    title: "Макс",
    subtitle: `Полный доступ ко всем ${LESSONS_TOTAL} урокам`,
    priceRub: 1999,
    priceLabel: "1 999 ₽",
    features: [
      "Все возможности тарифа «Старт»",
      "Уроки уровня «Макс» (продвинутые сценарии)",
      "Приоритетная проверка и расширенные задания",
    ],
  },
];

export const DEFAULT_PAID_PLAN: PaidPlanId = "max";

export const paidPlanById: Record<PaidPlanId, Plan> = {
  start: plans.find((plan) => plan.id === "start") as Plan,
  max: plans.find((plan) => plan.id === "max") as Plan,
};

export const isPaidPlanId = (value: unknown): value is PaidPlanId => {
  return value === "start" || value === "max";
};

