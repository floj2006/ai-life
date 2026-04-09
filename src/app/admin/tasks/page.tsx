import Link from "next/link";
import { getAdminTasksData, formatAdminDateTime } from "@/lib/admin-panel-data";
import { submissionStatusClasses, submissionStatusLabels } from "@/lib/submissions";

export default async function AdminTasksPage() {
  const { warnings, counts, items } = await getAdminTasksData();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Задания</h2>
            <p className="mt-1 text-sm text-slate-600">
              Быстрый обзор всех отправок без входа в детальную карточку.
            </p>
          </div>
          <Link
            href="/admin/review"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Перейти к проверке
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {submissionStatusLabels.sent}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{counts.sent}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {submissionStatusLabels.in_review}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{counts.inReview}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {submissionStatusLabels.needs_revision}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{counts.needsRevision}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {submissionStatusLabels.approved}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{counts.approved}</p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h3 className="text-lg font-semibold text-slate-900">Последние отправки</h3>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Пока нет отправленных заданий.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.lessonTitle}</p>
                    <p className="text-xs text-slate-500">
                      {item.studentName || "Без имени"} {item.studentEmail ? `(${item.studentEmail})` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${submissionStatusClasses[item.status]}`}
                  >
                    {submissionStatusLabels[item.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Обновлено: {formatAdminDateTime(item.updatedAt)}</p>
              </li>
            ))}
          </ul>
        )}
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

