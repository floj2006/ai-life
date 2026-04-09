import { getAdminSettingsData } from "@/lib/admin-panel-data";

export default async function AdminSettingsPage() {
  const { tables, yookassaConfigured } = await getAdminSettingsData();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Настройки и диагностика</h2>
        <p className="mt-1 text-sm text-slate-600">
          Проверка ключевых таблиц и состояния платежного контура.
        </p>

        <ul className="mt-4 grid gap-2 text-sm">
          {tables.map((table) => (
            <li
              key={table.table}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span>{table.table}</span>
              <span
                className={
                  table.status === "ready"
                    ? "font-semibold text-emerald-700"
                    : table.status === "missing"
                      ? "font-semibold text-amber-700"
                      : "font-semibold text-red-700"
                }
              >
                {table.status === "ready"
                  ? "готово"
                  : table.status === "missing"
                    ? "не найдено"
                    : "ошибка"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm text-slate-700">
            ЮKassa:{" "}
            <span className={yookassaConfigured ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
              {yookassaConfigured ? "настроена" : "не настроена"}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Если таблицы отсутствуют, примените SQL из <code>supabase/schema.sql</code> и затем выполните:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-white p-2 text-xs text-slate-700">
{`NOTIFY pgrst, 'reload schema';`}
          </pre>
        </div>
      </section>
    </div>
  );
}

