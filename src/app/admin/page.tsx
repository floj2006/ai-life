import Link from "next/link";
import type { ReactNode } from "react";
import { TierUpdateForm } from "@/components/admin/tier-update-form";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { requireAdminUser } from "@/lib/admin-access";
import {
  buildDbLessonReferenceMap,
  collectUnresolvedLessonIds,
  resolveDemoLessonFromReference,
} from "@/lib/lesson-reference";
import { cleanLessonTitle } from "@/lib/lesson-title";
import { isSubmissionStatus, submissionStatusLabels } from "@/lib/submissions";
import { getTierLabel, normalizeSubscriptionTier } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubmissionStatus, SubscriptionTier } from "@/lib/types";

type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_pro: boolean | null;
  subscription_tier: string | null;
  created_at: string | null;
};

type SubmissionRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type AdminAuditLogRow = {
  id: string;
  actor_email: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type AnalyticsUserRow = {
  user_id: string | null;
};

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

type SidebarItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type QueueItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  lessonTitle: string;
  status: SubmissionStatus;
  urgencyLabel: string;
  urgencyClassName: string;
  updatedAt: string;
};

const auditActionLabels: Record<string, string> = {
  user_tier_updated: "Изменен тариф пользователя",
  submission_status_updated: "Изменен статус задания",
};

const isMissingTableError = (message: string | undefined, table: string) => {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("could not find the table") && normalized.includes(`public.${table}`);
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

const getHoursSince = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
};

const getUrgencyMeta = (status: SubmissionStatus, updatedAt: string) => {
  const hours = getHoursSince(updatedAt);

  if ((status === "sent" && hours >= 18) || hours >= 48) {
    return {
      label: "Срочно",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if ((status === "in_review" && hours >= 12) || (status === "needs_revision" && hours >= 24)) {
    return {
      label: "Повышенный",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Стандарт",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
};

const normalizeTierFromMetadata = (value: unknown): SubscriptionTier => {
  if (value === "newbie" || value === "start" || value === "max") {
    return value;
  }

  return "newbie";
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

const MetricCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) => (
  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold leading-none text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{hint}</p>
  </article>
);

const sidebarItems: SidebarItem[] = [
  {
    label: "Панель",
    href: "/admin#dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="8" height="8" rx="1.8" />
        <rect x="13" y="3" width="8" height="5" rx="1.8" />
        <rect x="13" y="11" width="8" height="10" rx="1.8" />
        <rect x="3" y="14" width="8" height="7" rx="1.8" />
      </svg>
    ),
  },
  {
    label: "Пользователи",
    href: "/admin#users",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 19c0-3 2.8-5 6-5s6 2 6 5" />
        <path d="M14 19c.2-1.5 1.6-2.8 3.5-2.8 2 0 3.5 1.3 3.5 2.8" />
      </svg>
    ),
  },
  {
    label: "Задания",
    href: "/admin#tasks",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="4" y="3" width="16" height="18" rx="2.2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    label: "Очередь проверки",
    href: "/admin#review-queue",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="m5 12 4 4 10-10" />
        <path d="M4 4h16v16H4z" />
      </svg>
    ),
  },
  {
    label: "Тарифы",
    href: "/admin#pricing",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
        <path d="M2.5 10.5h19" />
      </svg>
    ),
  },
  {
    label: "Сообщения",
    href: "/admin#messages",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Настройки",
    href: "/admin#settings",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" />
      </svg>
    ),
  },
];

const renderFatal = (message: string) => (
  <main className="with-mobile-nav min-h-screen bg-[#f5f7fb]">
    <div className="mx-auto w-full max-w-[1360px] px-3 py-4 md:px-6 md:py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
        <h1 className="text-2xl font-bold text-slate-900">Админ-панель</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </section>
    </div>
    <MobileBottomNav isAdmin />
  </main>
);

export default async function AdminPage() {
  const { user } = await requireAdminUser();
  const admin = createAdminClient();

  const now = new Date();
  const since24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7dIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    authUsersResult,
    usersResult,
    submissionsResult,
    auditLogsResult,
    analyticsUsersResult,
    errorCountResult,
    messagesCountResult,
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
      .from("lesson_submissions")
      .select("id, user_id, lesson_id, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(800),
    admin
      .from("admin_audit_logs")
      .select("id, actor_email, action, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(14),
    admin
      .from("analytics_events")
      .select("user_id")
      .gte("created_at", since7dIso)
      .not("user_id", "is", null)
      .limit(5000),
    admin
      .from("app_error_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24hIso),
    admin
      .from("submission_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24hIso),
  ]);

  const usersTableMissing = isMissingTableError(usersResult.error?.message, "users");
  const submissionsTableMissing = isMissingTableError(
    submissionsResult.error?.message,
    "lesson_submissions",
  );
  const auditTableMissing = isMissingTableError(auditLogsResult.error?.message, "admin_audit_logs");
  const analyticsTableMissing = isMissingTableError(
    analyticsUsersResult.error?.message,
    "analytics_events",
  );
  const errorsTableMissing = isMissingTableError(errorCountResult.error?.message, "app_error_events");
  const messagesTableMissing = isMissingTableError(
    messagesCountResult.error?.message,
    "submission_messages",
  );

  if (usersResult.error && !usersTableMissing) {
    return renderFatal(`Не удалось загрузить пользователей: ${usersResult.error.message}`);
  }

  if (usersTableMissing && authUsersResult.error) {
    return renderFatal(
      `Не удалось загрузить пользователей из системы авторизации: ${authUsersResult.error.message}`,
    );
  }

  if (submissionsResult.error && !submissionsTableMissing) {
    return renderFatal(`Не удалось загрузить задания: ${submissionsResult.error.message}`);
  }

  if (auditLogsResult.error && !auditTableMissing) {
    return renderFatal(`Не удалось загрузить журнал действий: ${auditLogsResult.error.message}`);
  }

  if (analyticsUsersResult.error && !analyticsTableMissing) {
    return renderFatal(`Не удалось загрузить аналитику: ${analyticsUsersResult.error.message}`);
  }

  if (errorCountResult.error && !errorsTableMissing) {
    return renderFatal(`Не удалось загрузить ошибки: ${errorCountResult.error.message}`);
  }

  if (messagesCountResult.error && !messagesTableMissing) {
    return renderFatal(`Не удалось загрузить сообщения: ${messagesCountResult.error.message}`);
  }

  const warnings: string[] = [];
  if (usersTableMissing) {
    warnings.push("Таблица public.users не найдена: список пользователей загружен из системы авторизации.");
  }
  if (submissionsTableMissing) {
    warnings.push("Таблица public.lesson_submissions не найдена: блок очереди проверки скрыт.");
  }
  if (auditTableMissing) {
    warnings.push("Таблица public.admin_audit_logs не найдена: журнал действий временно пуст.");
  }
  if (analyticsTableMissing) {
    warnings.push("Таблица public.analytics_events не найдена: активность пользователей посчитана по заданиям.");
  }
  if (errorsTableMissing) {
    warnings.push("Таблица public.app_error_events не найдена: метрика ошибок недоступна.");
  }
  if (messagesTableMissing) {
    warnings.push("Таблица public.submission_messages не найдена: метрика сообщений недоступна.");
  }

  const authRows = (authUsersResult.data?.users ?? []).map(mapAuthUserToRow);
  const users = usersTableMissing
    ? authRows
    : mergeUsers((usersResult.data ?? []) as AdminUserRow[], authRows);

  const submissionsRaw = submissionsTableMissing
    ? []
    : ((submissionsResult.data ?? []) as SubmissionRow[]);

  const submissions = submissionsRaw
    .filter((submission) => isSubmissionStatus(submission.status))
    .map((submission) => ({
      ...submission,
      status: submission.status as SubmissionStatus,
    }));

  const userMap = new Map(users.map((row) => [row.id, row]));

  const unresolvedLessonIds = collectUnresolvedLessonIds(submissions.map((submission) => submission.lesson_id));
  let lessonReferenceMap = new Map();

  if (unresolvedLessonIds.length > 0) {
    const lessonReferenceResult = await admin
      .from("lessons")
      .select("id, slug")
      .in("id", unresolvedLessonIds);

    if (!lessonReferenceResult.error) {
      lessonReferenceMap = buildDbLessonReferenceMap(
        (lessonReferenceResult.data ?? []) as LessonReferenceRow[],
      );
    }
  }

  const tasksPendingReview = submissions.filter((item) => item.status !== "approved").length;
  const needsRevisionCount = submissions.filter((item) => item.status === "needs_revision").length;
  const completedTasksCount = submissions.filter((item) => item.status === "approved").length;

  const analyticsUsers = analyticsTableMissing
    ? []
    : ((analyticsUsersResult.data ?? []) as AnalyticsUserRow[]);

  const activeUsersByAnalytics = new Set(
    analyticsUsers.map((item) => item.user_id).filter((value): value is string => Boolean(value)),
  ).size;

  const activeUsersBySubmissions = new Set(
    submissions
      .filter((item) => new Date(item.updated_at).getTime() >= new Date(since7dIso).getTime())
      .map((item) => item.user_id),
  ).size;

  const activeUsersCount = activeUsersByAnalytics > 0 ? activeUsersByAnalytics : activeUsersBySubmissions;

  const newUsersTodayCount = users.filter((item) => {
    if (!item.created_at) {
      return false;
    }

    const createdAt = new Date(item.created_at);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfToday;
  }).length;

  const errorCount24h = errorsTableMissing ? 0 : errorCountResult.count ?? 0;
  const messagesCount24h = messagesTableMissing ? 0 : messagesCountResult.count ?? 0;
  const errorsAndFlagsCount = errorCount24h + needsRevisionCount;

  const queueItems: QueueItem[] = submissions
    .filter((item) => item.status !== "approved")
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .slice(0, 10)
    .map((item) => {
      const lesson = resolveDemoLessonFromReference(item.lesson_id, lessonReferenceMap);
      const student = userMap.get(item.user_id);
      const urgency = getUrgencyMeta(item.status, item.updated_at);

      return {
        id: item.id,
        studentName: student?.full_name || "Ученик",
        studentEmail: student?.email || "без email",
        lessonTitle: cleanLessonTitle(lesson?.title ?? "Урок"),
        status: item.status,
        urgencyLabel: urgency.label,
        urgencyClassName: urgency.className,
        updatedAt: item.updated_at,
      };
    });

  const auditLogs = auditTableMissing ? [] : ((auditLogsResult.data ?? []) as AdminAuditLogRow[]);
  const adminFullName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name
      : user.email?.split("@")[0] ?? "Админ";

  const adminTier = normalizeSubscriptionTier(
    user.user_metadata?.subscription_tier,
    user.user_metadata?.is_pro === true,
  );
  const usersByTier = users.reduce<Record<SubscriptionTier, number>>(
    (accumulator, entry) => {
      const tier = normalizeSubscriptionTier(entry.subscription_tier, entry.is_pro);
      accumulator[tier] += 1;
      return accumulator;
    },
    { newbie: 0, start: 0, max: 0 },
  );

  return (
    <main className="with-mobile-nav min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-[1360px] px-3 py-4 md:px-6 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 flex min-h-[calc(100vh-48px)] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <div className="mb-4 border-b border-slate-200 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI Easy Life</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Консоль администратора</p>
              </div>

              <nav className="space-y-1.5" aria-label="Навигация администратора">
                {sidebarItems.map((item, index) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      index === 0
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-slate-200 pt-4">
                <LogoutButton tone="danger" className="w-full" />
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-5">
            <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)] md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Панель</p>
                  <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                    Здравствуйте, {adminFullName}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    Оперативная панель по пользователям, проверке и активности платформы.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    Роль: Админ
                  </span>
                  <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700">
                    План: {getTierLabel(adminTier)}
                  </span>
                </div>
              </div>

              {warnings.length > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">Проверка схемы Supabase</p>
                  <ul className="mt-1 space-y-1 text-sm text-amber-900">
                    {warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </header>

            <section id="dashboard" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Заданий на проверке"
                value={tasksPendingReview}
                hint="Заданий требуют вашего решения"
              />
              <MetricCard
                label="Активные пользователи (7 дней)"
                value={activeUsersCount}
                hint="Уникальные активные ученики за 7 дней"
              />
              <MetricCard
                label="Новые пользователи сегодня"
                value={newUsersTodayCount}
                hint="Регистрации с 00:00 текущего дня"
              />
              <MetricCard
                label="Принятые задания"
                value={completedTasksCount}
                hint="Всего заданий со статусом «Принято»"
              />
              <MetricCard
                label="Ошибки и флаги"
                value={errorsAndFlagsCount}
                hint="Ошибки интерфейса + задания на доработке"
              />
              <MetricCard
                label="Сообщения (24 часа)"
                value={messagesCount24h}
                hint="Новые сообщения в проверке за сутки"
              />
            </section>

            <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
              <div className="space-y-5">
                <section
                  id="review-queue"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)] md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">Очередь проверки</h2>
                    <Link
                      href="/review"
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                    >
                      Открыть очередь
                    </Link>
                  </div>

                  {queueItems.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Открытых заданий пока нет.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {queueItems.map((item) => (
                        <li key={item.id} className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{item.lessonTitle}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {item.studentName} • {item.studentEmail}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                                {submissionStatusLabels[item.status]}
                              </span>
                              <span className={`rounded-md border px-2 py-1 text-xs font-medium ${item.urgencyClassName}`}>
                                {item.urgencyLabel}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Обновлено: {formatDateTime(item.updatedAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section
                  id="activity"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)] md:p-6"
                >
                  <h2 className="text-xl font-semibold text-slate-900">Последние действия</h2>
                  {auditLogs.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Действий пока нет. Журнал заполнится автоматически.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {auditLogs.map((entry) => (
                        <li key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {auditActionLabels[entry.action] ?? entry.action}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {entry.actor_email || "Администратор"} • {formatDateTime(entry.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section
                  id="users"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)] md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">Пользователи</h2>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                      Всего: {users.length}
                    </span>
                  </div>

                  {users.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Пользователи пока не зарегистрированы.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-slate-600">Пользователь</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Текущий тариф</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Регистрация</th>
                            <th className="px-4 py-3 font-semibold text-slate-600">Действие</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {users.map((entry) => {
                            const tier = normalizeSubscriptionTier(
                              entry.subscription_tier,
                              entry.is_pro,
                            ) as SubscriptionTier;

                            return (
                              <tr key={entry.id} className="align-top">
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-slate-900">{entry.full_name || "Без имени"}</p>
                                  <p className="mt-1 text-xs text-slate-600">{entry.email || "без email"}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {getTierLabel(tier)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-slate-600">{formatDate(entry.created_at)}</td>
                                <td className="px-4 py-4">
                                  <TierUpdateForm userId={entry.id} currentTier={tier} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-5">
                <section
                  id="quick-actions"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                >
                  <h2 className="text-lg font-semibold text-slate-900">Быстрые операции</h2>
                  <div className="mt-4 grid gap-2.5">
                    <Link
                      href="/review"
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                    >
                      Открыть очередь проверки
                    </Link>
                    <Link
                      href="/submissions?tab=active"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Открыть задания
                    </Link>
                    <Link
                      href="/billing"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Тарифы и планы
                    </Link>
                    <Link
                      href="/setup"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Настройки платформы
                    </Link>
                    <LogoutButton tone="danger" className="w-full" />
                  </div>
                </section>

                <section
                  id="tasks"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                >
                  <h2 className="text-lg font-semibold text-slate-900">Задания</h2>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">Новых</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {submissions.filter((item) => item.status === "sent").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">На проверке</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {submissions.filter((item) => item.status === "in_review").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">Нужна доработка</span>
                      <span className="text-sm font-semibold text-slate-900">{needsRevisionCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">Принято</span>
                      <span className="text-sm font-semibold text-slate-900">{completedTasksCount}</span>
                    </div>
                  </div>
                </section>

                <section
                  id="pricing"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                >
                  <h2 className="text-lg font-semibold text-slate-900">Тарифы и планы</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Распределение пользователей по уровням доступа.
                  </p>
                  <div className="mt-4 grid gap-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">Новичок</span>
                      <span className="text-sm font-semibold text-slate-900">{usersByTier.newbie}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">Старт</span>
                      <span className="text-sm font-semibold text-slate-900">{usersByTier.start}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-600">Макс</span>
                      <span className="text-sm font-semibold text-slate-900">{usersByTier.max}</span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <Link
                      href="/billing"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Открыть страницу оплаты
                    </Link>
                    <Link
                      href="/admin#users"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Выдать тариф пользователю
                    </Link>
                  </div>
                </section>

                <section
                  id="messages"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                >
                  <h2 className="text-lg font-semibold text-slate-900">Сообщения</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Новых сообщений за 24 часа: <span className="font-semibold text-slate-900">{messagesCount24h}</span>
                  </p>
                  <div className="mt-3">
                    <Link
                      href="/submissions?tab=active"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Открыть переписку
                    </Link>
                  </div>
                </section>

                <section
                  id="settings"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                >
                  <h2 className="text-lg font-semibold text-slate-900">Настройки</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Быстрый доступ к системным настройкам и запуску технической подготовки.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Link
                      href="/setup"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Открыть мастер настройки
                    </Link>
                    <Link
                      href="/review"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Перейти к проверке заданий
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </div>

      <MobileBottomNav isAdmin />
    </main>
  );
}

