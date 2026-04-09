import { PromoCodeCreateForm } from "@/components/admin/promo-code-create-form";
import { formatAdminDateTime, getAdminPromoCodesData } from "@/lib/admin-panel-data";

export default async function AdminPromoCodesPage() {
  const { warnings, promoCodesTableMissing, promoCodes } = await getAdminPromoCodesData();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Промокоды</h2>
        <p className="mt-1 text-sm text-slate-600">
          Создавайте скидки для тарифов. Скидка применяется автоматически на странице оплаты.
        </p>

        {promoCodesTableMissing ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Таблица <code>public.promo_codes</code> не найдена. Примените SQL-схему для включения промокодов.
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-sky-100 bg-gradient-to-b from-sky-50/70 to-white p-3 md:p-4">
            <PromoCodeCreateForm />
          </div>
        )}
      </section>

      {!promoCodesTableMissing ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900">Список промокодов</h3>

          {promoCodes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Промокоды пока не созданы.</p>
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {promoCodes.map((promo) => (
                <li
                  key={promo.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{promo.code}</p>
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        promo.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {promo.isActive ? "Активен" : "Выключен"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {promo.title || "Без названия"}
                    </span>
                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                      {promo.discountLabel}
                    </span>
                    <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-700">
                      {promo.planLabel}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    <p className="break-words">Использования: {promo.usageLabel}</p>
                    {promo.startsAt ? (
                      <p className="break-words">С: {formatAdminDateTime(promo.startsAt)}</p>
                    ) : null}
                    {promo.expiresAt ? (
                      <p className="break-words">До: {formatAdminDateTime(promo.expiresAt)}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

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

