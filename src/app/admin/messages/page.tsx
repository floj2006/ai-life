import Link from "next/link";
import { formatAdminDateTime, getAdminMessagesData } from "@/lib/admin-panel-data";

export default async function AdminMessagesPage() {
  const { warnings, messages } = await getAdminMessagesData();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Сообщения по заданиям</h2>
            <p className="mt-1 text-sm text-slate-600">
              Последние сообщения учеников и проверяющего.
            </p>
          </div>
          <Link
            href="/admin/review"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Открыть карточки проверки
          </Link>
        </div>

        {messages.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Пока нет новых сообщений.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {messages.map((message) => (
              <li key={message.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{message.lessonTitle}</p>
                  <span className="text-xs font-medium text-slate-500">{formatAdminDateTime(message.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {message.authorRole === "admin" ? "Ответ проверяющего" : "Сообщение ученика"} ·{" "}
                  {message.studentName || "Без имени"} {message.studentEmail ? `(${message.studentEmail})` : ""}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{message.message}</p>
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

