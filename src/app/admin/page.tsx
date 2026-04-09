import Link from "next/link";
import { getAdminDashboardData } from "@/lib/admin-panel-data";

const metricCards = (metrics: Awaited<ReturnType<typeof getAdminDashboardData>>["metrics"]) => [
  {
    label: "Заданий на проверке",
    value: metrics.submissionsPending,
    hint: "Новые + в работе",
  },
  {
    label: "Активные пользователи",
    value: metrics.activeUsers7d,
    hint: "За последние 7 дней",
  },
  {
    label: "Новые пользователи",
    value: metrics.usersNewToday,
    hint: "За сегодня",
  },
  {
    label: "Принятые задания",
    value: metrics.submissionsCompleted,
    hint: "Всего по системе",
  },
  {
    label: "Ошибки 24 часа",
    value: metrics.errors24h,
    hint: "События мониторинга",
  },
  {
    label: "Новые сообщения",
    value: metrics.messages24h,
    hint: "За последние 24 часа",
  },
];

export default async function AdminDashboardPage() {
  const { warnings, metrics } = await getAdminDashboardData();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Панель управления</h2>
        <p className="mt-1 text-sm text-slate-600">
          Быстрый обзор системы: пользователи, проверка заданий, сообщения и платежные показатели.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards(metrics).map((metric) => (
            <article
              key={metric.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-semibold leading-none text-slate-900">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h3 className="text-lg font-semibold text-slate-900">Быстрые действия</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/review"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Открыть очередь проверки
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Управление тарифами
          </Link>
          <Link
            href="/admin/promo-codes"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Создать промокод
          </Link>
          <Link
            href="/admin/messages"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Просмотр сообщений
          </Link>
          <Link
            href="/admin/pricing"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Тарифы и ЮKassa
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Диагностика схемы
          </Link>
        </div>
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Внимание к данным</p>
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

