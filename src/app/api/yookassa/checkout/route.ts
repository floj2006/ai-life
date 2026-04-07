import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PAID_PLAN,
  isPaidPlanId,
  paidPlanById,
  type PaidPlanId,
} from "@/lib/pricing";
import { createYooKassaPayment } from "@/lib/yookassa";

type CheckoutPayload = {
  plan?: string;
};

const toMoneyString = (rawValue: string | undefined, envName: string) => {
  const value = rawValue ?? "";
  const normalized = Number(value.replace(",", "."));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${envName} must be a positive number`);
  }

  return normalized.toFixed(2);
};

const getPlanAmount = (plan: PaidPlanId) => {
  if (plan === "start") {
    return toMoneyString(
      process.env.YOOKASSA_START_AMOUNT_RUB ?? "990.00",
      "YOOKASSA_START_AMOUNT_RUB",
    );
  }

  return toMoneyString(
    process.env.YOOKASSA_MAX_AMOUNT_RUB ?? "1399.00",
    "YOOKASSA_MAX_AMOUNT_RUB",
  );
};

const parsePlan = async (request: Request): Promise<PaidPlanId> => {
  try {
    const body = (await request.json()) as CheckoutPayload;
    return isPaidPlanId(body.plan) ? body.plan : DEFAULT_PAID_PLAN;
  } catch {
    return DEFAULT_PAID_PLAN;
  }
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await parsePlan(request);
  const selectedPlan = paidPlanById[plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const returnUrl = `${appUrl}/success`;

  try {
    const payment = await createYooKassaPayment({
      amountValue: getPlanAmount(plan),
      returnUrl,
      description: `AI Easy Life ${selectedPlan.title}`,
      userId: user.id,
      email: user.email ?? undefined,
      planId: plan,
    });

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return NextResponse.json(
        { error: "ЮKassa не вернула ссылку подтверждения платежа." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: confirmationUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YooKassa checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
