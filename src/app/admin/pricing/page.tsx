import Link from "next/link";
import { plans } from "@/lib/pricing";
import { getAdminPricingData } from "@/lib/admin-panel-data";

export default async function AdminPricingPage() {
  const { warnings, usersByTier, activePromoCodes, yookassaConfigured } = await getAdminPricingData();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Тарифы и оплата</h2>
        <p className="mt-1 text-sm text-slate-600">
          Контроль распределения пользователей по тарифам и текущего состояния оплаты.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Новичок</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{usersByTier.newbie}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Старт</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{usersByTier.start}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Макс</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{usersByTier.max}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Активные промокоды</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{activePromoCodes}</p>
          </article>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          ЮKassa:{" "}
          <span className={yookassaConfigured ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
            {yookassaConfigured ? "настроена" : "не настроена"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Текущие планы</h3>
          <Link
            href="/admin/promo-codes"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Открыть промокоды
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-xl border p-4 ${
                plan.id === "max" ? "border-sky-200 bg-sky-50/60" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">{plan.title}</p>
                <p className="text-lg font-semibold text-slate-900">{plan.priceLabel}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{plan.subtitle}</p>
              <ul className="mt-3 grid gap-1 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Предупреждения</p>
          <ul className="mt-2 grid gap-1">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

