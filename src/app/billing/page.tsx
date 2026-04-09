import Link from "next/link";
import { YooKassaCheckoutButton } from "@/components/billing/yookassa-checkout-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { TrackEventOnMount } from "@/components/telemetry/track-event-on-mount";
import { isAdminEmail } from "@/lib/admin-access";
import { getDashboardData } from "@/lib/dashboard-data";
import { plans } from "@/lib/pricing";
import { isYooKassaConfigured } from "@/lib/yookassa";

export default async function BillingPage() {
  const { profile } = await getDashboardData();
  const currentTier = profile.subscription_tier;
  const yookassaConfigured = isYooKassaConfigured();
  const isAdmin = isAdminEmail(profile.email);

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:py-8">
      <TrackEventOnMount
        eventName="billing_page_view"
        payload={{ currentTier, isAdmin, yookassaConfigured }}
      />

      <section className="surface fade-up p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">Тарифы и оплата</h1>
        <p className="small-text mt-2">
          Оплата выполняется онлайн через ЮKassa. После успешного платежа доступ активируется автоматически.
        </p>
        <p className="small-text mt-1">
          Если у вас есть промокод, введите его прямо в карточке тарифа перед оплатой.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/public-offer" className="action-button secondary-button w-full sm:w-auto">
            Публичная оферта
          </Link>
          <Link href="/privacy-policy" className="action-button secondary-button w-full sm:w-auto">
            Политика конфиденциальности
          </Link>
        </div>

        {!yookassaConfigured ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            ЮKassa не настроена. Добавьте переменные: <code>YOOKASSA_SHOP_ID</code> и <code>YOOKASSA_SECRET_KEY</code>.
          </p>
        ) : null}
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = currentTier === plan.id;
            const isMaxPlan = plan.id === "max";

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

                {!isCurrentPlan ? (
                  <div className="mt-4">
                    {yookassaConfigured ? (
                      <YooKassaCheckoutButton
                        plan={plan.id}
                        label={`Оплатить ${plan.title} через ЮKassa`}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="action-button secondary-button w-full cursor-not-allowed opacity-60"
                      >
                        Оплата временно недоступна
                      </button>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <h2 className="text-2xl font-bold">Как проходит оплата</h2>
        <ol className="mt-3 grid gap-2">
          <li className="rounded-xl bg-cyan-50 p-3 text-sm">
            1. Нажмите кнопку «Оплатить через ЮKassa» на нужном тарифе.
          </li>
          <li className="rounded-xl bg-cyan-50 p-3 text-sm">
            2. Подтвердите платеж на защищенной странице ЮKassa.
          </li>
          <li className="rounded-xl bg-cyan-50 p-3 text-sm">
            3. После статуса <strong>payment.succeeded</strong> тариф активируется автоматически.
          </li>
        </ol>
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard/courses" className="action-button secondary-button w-full sm:w-fit">
            Вернуться к урокам
          </Link>
        </div>
      </section>

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}
