import Link from "next/link";
import { TierUpdateForm } from "@/components/admin/tier-update-form";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { requireAdminUser } from "@/lib/admin-access";
import { getTierLabel, normalizeSubscriptionTier } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionTier } from "@/lib/types";

type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_pro: boolean | null;
  subscription_tier: string | null;
  created_at: string | null;
};

type AdminAuditLogRow = {
  id: string;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_submission_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type TelemetryMetric = {
  label: string;
  value: number;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU");
};

const isMissingTableError = (message: string, table: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table") && normalized.includes(`public.${table}`);
};

const normalizeTierFromMetadata = (value: unknown): SubscriptionTier => {
  if (value === "newbie" || value === "start" || value === "max") {
    return value;
  }

  return "newbie";
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const auditActionLabels: Record<string, string> = {
  user_tier_updated: "Изменен тариф пользователя",
  submission_status_updated: "Изменен статус задания",
};

const mapAuthUserToRow = (user: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) => {
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const metadataTier = normalizeTierFromMetadata(user.user_metadata?.subscription_tier);
  const metadataIsPro = user.user_metadata?.is_pro === true || metadataTier === "max";

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    is_pro: metadataIsPro,
    subscription_tier: metadataTier,
    created_at: user.created_at ?? null,
  } satisfies AdminUserRow;
};

const mergeUsers = (primary: AdminUserRow[], secondary: AdminUserRow[]) => {
  const map = new Map<string, AdminUserRow>();

  for (const row of secondary) {
    map.set(row.id, row);
  }

  for (const row of primary) {
    const fallback = map.get(row.id);
    map.set(row.id, {
      ...fallback,
      ...row,
      email: row.email ?? fallback?.email ?? null,
      full_name: row.full_name ?? fallback?.full_name ?? null,
      subscription_tier: row.subscription_tier ?? fallback?.subscription_tier ?? "newbie",
      is_pro: row.is_pro ?? fallback?.is_pro ?? false,
      created_at: row.created_at ?? fallback?.created_at ?? null,
    });
  }

  return [...map.values()].sort((a, b) => {
    const left = a.created_at ? new Date(a.created_at).getTime() : 0;
    const right = b.created_at ? new Date(b.created_at).getTime() : 0;
    return right - left;
  });
};

const MissingUsersHint = () => {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        В Supabase пока не найдена таблица <code>public.users</code>.
      </p>
      <p className="small-text mt-2">
        Выполните SQL из <code>supabase/schema.sql</code>, затем в SQL Editor запустите:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-sm">{`NOTIFY pgrst, 'reload schema';`}</pre>
    </div>
  );
};

const AdminNav = () => <MobileBottomNav isAdmin />;

export default async function AdminPage() {
  await requireAdminUser();
  const admin = createAdminClient();
  // eslint-disable-next-line react-hooks/purity
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    authUsersResult,
    usersResult,
    auditLogsResult,
    pageViewCountResult,
    submissionEventCountResult,
    errorCountResult,
  ] = await Promise.all([
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    }),
    admin
      .from("users")
      .select("id, full_name, email, is_pro, subscription_tier, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("admin_audit_logs")
      .select("id, actor_email, action, target_user_id, target_submission_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "page_view")
      .gte("created_at", since24hIso),
    admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "submission_created")
      .gte("created_at", since24hIso),
    admin
      .from("app_error_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24hIso),
  ]);

  const authRows = (authUsersResult.data?.users ?? []).map(mapAuthUserToRow);
  const { data, error } = usersResult;

  let users: AdminUserRow[] = [];
  let usersLoadWarning: string | null = null;
  const auditLogs = isMissingTableError(auditLogsResult.error?.message ?? "", "admin_audit_logs")
    ? []
    : ((auditLogsResult.data ?? []) as AdminAuditLogRow[]);
  const telemetryMetrics: TelemetryMetric[] = [
    {
      label: "Просмотры страниц за 24 часа",
      value: pageViewCountResult.count ?? 0,
    },
    {
      label: "Отправки заданий за 24 часа",
      value: submissionEventCountResult.count ?? 0,
    },
    {
      label: "Ошибки интерфейса за 24 часа",
      value: errorCountResult.count ?? 0,
    },
  ];

  if (!error) {
    users = mergeUsers((data ?? []) as AdminUserRow[], authRows);

    if ((data?.length ?? 0) === 0 && users.length > 0) {
      usersLoadWarning =
        "Пользователи показаны из Auth. Если нужно хранить профили отдельно, синхронизируйте таблицу public.users через schema.sql.";
    }
  } else {
    const missingUsersTable = isMissingTableError(error.message, "users");

    if (!missingUsersTable) {
      return (
        <main className="container-shell with-mobile-nav py-6">
          <section className="surface p-6">
            <h1 className="text-3xl font-bold">Админ-панель</h1>
            <p className="small-text mt-2">Не удалось загрузить пользователей: {error.message}</p>
          </section>
          <AdminNav />
        </main>
      );
    }

    if (authUsersResult.error) {
      return (
        <main className="container-shell with-mobile-nav py-6">
          <section className="surface p-6">
            <h1 className="text-3xl font-bold">Админ-панель</h1>
            <p className="small-text mt-2">
              Не удалось загрузить пользователей: {authUsersResult.error.message}
            </p>
            <MissingUsersHint />
          </section>
          <AdminNav />
        </main>
      );
    }

    users = authRows;
    usersLoadWarning =
      "Таблица public.users пока не найдена. Список загружен из Auth, выдача тарифов продолжит работать через metadata.";
  }

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Админ-панель</h1>
            <p className="small-text mt-2">
              Здесь вы вручную выдаете уровни Newbie, Start и Max. Пользователей в списке: {users.length}.
            </p>
            {usersLoadWarning ? (
              <p className="small-text mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {usersLoadWarning}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/review" className="action-button secondary-button">
              Проверка заданий
            </Link>
            <Link href="/dashboard" className="action-button secondary-button">
              В кабинет
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="surface p-5 md:p-6">
          <h2 className="text-2xl font-bold">Сводка за 24 часа</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {telemetryMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl bg-sky-50/80 px-4 py-4 ring-1 ring-sky-100"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface p-5 md:p-6">
          <h2 className="text-2xl font-bold">Последние действия</h2>
          {auditLogs.length === 0 ? (
            <p className="small-text mt-3">
              Журнал пока пуст. После выдачи тарифа или смены статуса записи появятся здесь.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {auditLogs.map((entry) => {
                const previousTier =
                  typeof entry.metadata?.previousTier === "string" ? entry.metadata.previousTier : null;
                const nextTier =
                  typeof entry.metadata?.nextTier === "string" ? entry.metadata.nextTier : null;
                const previousStatus =
                  typeof entry.metadata?.previousStatus === "string" ? entry.metadata.previousStatus : null;
                const nextStatus =
                  typeof entry.metadata?.nextStatus === "string" ? entry.metadata.nextStatus : null;

                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl bg-white px-4 py-4 ring-1 ring-[var(--line)]"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {auditActionLabels[entry.action] ?? entry.action}
                    </p>
                    <p className="small-text mt-1">
                      {entry.actor_email || "Администратор"} • {formatDateTime(entry.created_at)}
                    </p>
                    {previousTier && nextTier ? (
                      <p className="small-text mt-2">
                        Тариф: {previousTier} → {nextTier}
                      </p>
                    ) : null}
                    {previousStatus && nextStatus ? (
                      <p className="small-text mt-2">
                        Статус: {previousStatus} → {nextStatus}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      {users.length === 0 ? (
        <section className="surface p-6">
          <p className="small-text">Пользователи пока не зарегистрированы.</p>
        </section>
      ) : (
        <section className="grid gap-4">
          {users.map((user) => {
            const tier = normalizeSubscriptionTier(
              user.subscription_tier,
              user.is_pro,
            ) as SubscriptionTier;

            return (
              <article key={user.id} className="surface p-4 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{user.full_name || "Без имени"}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      tier === "max"
                        ? "bg-sky-100 text-sky-800"
                        : tier === "start"
                          ? "bg-slate-100 text-slate-800"
                          : "bg-cyan-100 text-cyan-800"
                    }`}
                  >
                    {getTierLabel(tier)}
                  </span>
                </div>

                <p className="small-text mt-1">Email: {user.email || "-"}</p>
                <p className="small-text">ID: {user.id}</p>
                <p className="small-text">Регистрация: {formatDate(user.created_at)}</p>

                <div className="mt-3">
                  <TierUpdateForm userId={user.id} currentTier={tier} />
                </div>
              </article>
            );
          })}
        </section>
      )}

      <AdminNav />
    </main>
  );
}

