import Link from "next/link";
import { CopyRequisitesButton } from "@/components/billing/copy-requisites-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { TrackEventOnMount } from "@/components/telemetry/track-event-on-mount";
import { isAdminEmail } from "@/lib/admin-access";
import { getDashboardData } from "@/lib/dashboard-data";
import {
  getDirectPaymentContactText,
  getDirectPaymentRequisites,
  isDirectPaymentConfigured,
} from "@/lib/direct-payment";
import { plans } from "@/lib/pricing";

export default async function BillingPage() {
  const { profile } = await getDashboardData();
  const currentTier = profile.subscription_tier;
  const contactText = getDirectPaymentContactText();
  const directConfigured = isDirectPaymentConfigured();
  const isAdmin = isAdminEmail(profile.email);

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:py-8">
      <TrackEventOnMount
        eventName="billing_page_view"
        payload={{ currentTier, isAdmin }}
      />
      <section className="surface fade-up p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Тарифы и оплата
        </h1>
        <p className="small-text mt-2">
          Оплата идет по реквизитам. После перевода отправьте подтверждение, и мы вручную активируем нужный тариф.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/public-offer" className="action-button secondary-button w-full sm:w-auto">
            Публичная оферта
          </Link>
          <Link href="/privacy-policy" className="action-button secondary-button w-full sm:w-auto">
            Политика конфиденциальности
          </Link>
        </div>
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = currentTier === plan.id;
            const isMaxPlan = plan.id === "max";
            const requisites = getDirectPaymentRequisites(plan.id);
            const shortUserId = profile.id.slice(0, 8).toUpperCase();
            const paymentComment = `Комментарий к переводу: AI EASY LIFE | тариф ${plan.title} | ID ${shortUserId}`;
            const copyPayload = requisites
              ? `${requisites}\n\n${paymentComment}`
              : paymentComment;

            return (
              <article
                key={plan.id}
                className={`rounded-2xl border p-5 ${
                  isMaxPlan ? "border-sky-300 bg-sky-50" : "border-[var(--line)] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{plan.title}</h2>
                    <p className="small-text">{plan.subtitle}</p>
                  </div>
                  <p className="text-2xl font-bold">{plan.priceLabel}</p>
                </div>

                <ul className="mt-3 grid gap-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="small-text">
                      - {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-sky-800 ring-1 ring-sky-200">
                    Текущий тариф
                  </p>
                ) : null}

                <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-[var(--line)]">
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                    Реквизиты для оплаты
                  </p>

                  {requisites ? (
                    <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                      {requisites}
                    </pre>
                  ) : (
                    <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm font-medium text-red-700">
                      Реквизиты для тарифа {plan.title} пока не настроены.
                    </p>
                  )}

                  <p className="mt-2 rounded-xl bg-cyan-50 p-2 text-sm leading-relaxed">
                    {paymentComment}
                  </p>

                  <div className="mt-3">
                    <CopyRequisitesButton text={copyPayload} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <h2 className="text-2xl font-bold">После оплаты</h2>
        <ol className="mt-3 grid gap-2">
          <li className="rounded-xl bg-cyan-50 p-3 text-sm">
            1. Скопируйте реквизиты нужного тарифа.
          </li>
          <li className="rounded-xl bg-cyan-50 p-3 text-sm">
            2. Сделайте перевод на точную сумму тарифа.
          </li>
          <li className="rounded-xl bg-cyan-50 p-3 text-sm">
            3. Отправьте подтверждение оплаты:{" "}
            {contactText || "добавьте контакт в настройках окружения"}.
          </li>
        </ol>

        {!directConfigured ? (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            Реквизиты не настроены. Добавьте {"`NEXT_PUBLIC_DIRECT_PAYMENT_START_REQUISITES`"} и{" "}
            {"`NEXT_PUBLIC_DIRECT_PAYMENT_MAX_REQUISITES`"}.
          </p>
        ) : null}
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="action-button secondary-button w-full sm:w-fit">
            Вернуться к урокам
          </Link>
        </div>
      </section>

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}
