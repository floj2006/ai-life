import { TierUpdateForm } from "@/components/admin/tier-update-form";
import { formatAdminDate, getAdminUsers } from "@/lib/admin-panel-data";
import { getTierLabel } from "@/lib/subscription";

export default async function AdminUsersPage() {
  const { users, warnings } = await getAdminUsers();

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">Пользователи и тарифы</h2>
        <p className="mt-1 text-sm text-slate-600">
          Изменение тарифов выполняется мгновенно и отражается в кабинете ученика.
        </p>

        {users.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Пользователи пока не зарегистрированы.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-4 py-3">Пользователь</th>
                    <th className="px-4 py-3">Текущий тариф</th>
                    <th className="px-4 py-3">Регистрация</th>
                    <th className="px-4 py-3">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm font-semibold text-slate-900">{user.fullName || "Без имени"}</p>
                        <p className="text-xs text-slate-500">{user.email || "Email не указан"}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {getTierLabel(user.tier)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-slate-600">
                        {formatAdminDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <TierUpdateForm userId={user.id} currentTier={user.tier} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

