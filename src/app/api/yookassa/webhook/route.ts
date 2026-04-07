import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getYooKassaPayment } from "@/lib/yookassa";

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

export async function POST(request: Request) {
  let payload: YooKassaWebhookBody;
  try {
    payload = (await request.json()) as YooKassaWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentId = payload.object?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  try {
    const payment = await getYooKassaPayment(paymentId);
    if (payment.status !== "succeeded" || !payment.paid) {
      return NextResponse.json(
        { error: "Payment is not succeeded" },
        { status: 400 },
      );
    }

    const userId = payment.metadata?.user_id;
    if (!userId) {
      return NextResponse.json(
        { error: "Missing user_id in payment metadata" },
        { status: 400 },
      );
    }

    const paidPlan = payment.metadata?.plan_id === "max" ? "max" : "start";

    const admin = createAdminClient();
    const { data: existingUser } = await admin
      .from("users")
      .select("is_pro")
      .eq("id", userId)
      .maybeSingle();

    const alreadyMax = existingUser?.is_pro === true;
    const grantMax = alreadyMax || paidPlan === "max";
    const tier = grantMax ? "max" : "start";

    const upsertWithTier = await admin.from("users").upsert(
      {
        id: userId,
        is_pro: grantMax,
        subscription_tier: tier,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );

    if (!upsertWithTier.error) {
      return NextResponse.json({ received: true });
    }

    if (!isMissingTierColumnError(upsertWithTier.error.message)) {
      return NextResponse.json({ error: upsertWithTier.error.message }, { status: 500 });
    }

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

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YooKassa webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
