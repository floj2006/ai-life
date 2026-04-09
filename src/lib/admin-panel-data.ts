import "server-only";
import { buildDbLessonReferenceMap, collectUnresolvedLessonIds, resolveDemoLessonFromReference } from "@/lib/lesson-reference";
import { cleanLessonTitle } from "@/lib/lesson-title";
import { formatPromoDiscountLabel } from "@/lib/promo-codes";
import { isSubmissionStatus } from "@/lib/submissions";
import { normalizeSubscriptionTier } from "@/lib/subscription";
import { buildSubmissionMediaPreviewMap } from "@/lib/submission-media-preview";
import { decryptRecordFields } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { isYooKassaConfigured } from "@/lib/yookassa";
import type { LessonSubmission, SubmissionMessage, SubmissionStatus, SubscriptionTier } from "@/lib/types";

type RawUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_pro: boolean | null;
  subscription_tier: string | null;
  created_at: string | null;
};

type RawSubmissionRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  result_link: string | null;
  student_comment: string | null;
  created_at: string;
  updated_at: string;
};

type RawSubmissionMessageRow = {
  id: string;
  submission_id: string;
  author_id: string;
  author_role: "student" | "admin";
  message: string;
  created_at: string;
};

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

type RawPromoCodeRow = {
  id: string;
  code: string;
  title: string | null;
  discount_type: "percent" | "fixed_rub";
  discount_value: number | string;
  plan_scope: "all" | "start" | "max";
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type AdminUserItem = {
  id: string;
  fullName: string | null;
  email: string | null;
  isPro: boolean;
  tier: SubscriptionTier;
  createdAt: string | null;
};

export type AdminDashboardMetrics = {
  usersTotal: number;
  usersNewToday: number;
  submissionsPending: number;
  submissionsCompleted: number;
  activeUsers7d: number;
  errors24h: number;
  messages24h: number;
  activePromoCodes: number;
};

export type AdminReviewItem = {
  id: string;
  userId: string;
  lessonId: string;
  lessonTitle: string;
  studentName: string | null;
  studentEmail: string | null;
  status: SubmissionStatus;
  resultLink: string | null;
  studentComment: string;
  createdAt: string;
  updatedAt: string;
  messages: SubmissionMessage[];
  mediaPreview: {
    url: string;
    kind: "image" | "video";
  } | null;
};

export type AdminPromoCodeItem = {
  id: string;
  code: string;
  title: string | null;
  discountLabel: string;
  planLabel: string;
  isActive: boolean;
  usageLabel: string;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
};

export type AdminMessageItem = {
  id: string;
  submissionId: string;
  lessonTitle: string;
  studentName: string | null;
  studentEmail: string | null;
  authorRole: "student" | "admin";
  message: string;
  createdAt: string;
};

type AdminUsersResult = {
  users: AdminUserItem[];
  warnings: string[];
  usersTableMissing: boolean;
};

const isMissingTableError = (message: string | undefined, table: string) => {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("could not find the table") && normalized.includes(`public.${table}`);
};

const normalizeTierFromMetadata = (value: unknown): SubscriptionTier => {
  if (value === "newbie" || value === "start" || value === "max") {
    return value;
  }

  return "newbie";
};

const mapAuthUserToRow = (user: AuthUserRow): RawUserRow => {
  const metadataTier = normalizeTierFromMetadata(user.user_metadata?.subscription_tier);
  const metadataIsPro = user.user_metadata?.is_pro === true || metadataTier === "max";

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    is_pro: metadataIsPro,
    subscription_tier: metadataTier,
    created_at: user.created_at ?? null,
  };
};

const mergeUsers = (primary: RawUserRow[], secondary: RawUserRow[]) => {
  const map = new Map<string, RawUserRow>();

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

const toAdminUser = (row: RawUserRow): AdminUserItem => {
  const tier = normalizeSubscriptionTier(row.subscription_tier, row.is_pro);
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    isPro: tier === "max",
    tier,
    createdAt: row.created_at,
  };
};

const toSubmission = (row: RawSubmissionRow): LessonSubmission | null => {
  if (!isSubmissionStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    lesson_id: row.lesson_id,
    status: row.status,
    result_link: row.result_link,
    student_comment: row.student_comment ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const byUpdatedAtDesc = (left: LessonSubmission, right: LessonSubmission) =>
  new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();

const toPlanLabel = (value: RawPromoCodeRow["plan_scope"]) => {
  if (value === "start") {
    return "Только Старт";
  }
  if (value === "max") {
    return "Только Макс";
  }
  return "Любой тариф";
};

const toUsageLabel = (row: RawPromoCodeRow) => {
  if (typeof row.max_uses === "number" && row.max_uses > 0) {
    return `${row.used_count}/${row.max_uses}`;
  }
  return `${row.used_count} использований`;
};

const uniqueCount = (items: Array<string | null | undefined>) =>
  new Set(items.filter((value): value is string => Boolean(value))).size;

export const formatAdminDate = (value: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ru-RU");
};

export const formatAdminDateTime = (value: string | null) => {
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

export const getAdminUsers = async (): Promise<AdminUsersResult> => {
  const admin = createAdminClient();

  const [authUsersResult, usersResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    admin
      .from("users")
      .select("id, full_name, email, is_pro, subscription_tier, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const usersTableMissing = isMissingTableError(usersResult.error?.message, "users");
  if (usersResult.error && !usersTableMissing) {
    throw new Error(`Не удалось загрузить пользователей: ${usersResult.error.message}`);
  }
  if (usersTableMissing && authUsersResult.error) {
    throw new Error(`Не удалось загрузить пользователей из auth: ${authUsersResult.error.message}`);
  }

  const warnings: string[] = [];
  if (usersTableMissing) {
    warnings.push("Таблица public.users не найдена: список пользователей загружен из auth.");
  }

  const authRows = (authUsersResult.data?.users ?? []).map((user) => mapAuthUserToRow(user as AuthUserRow));
  const dbRows = usersTableMissing
    ? []
    : ((usersResult.data ?? []) as RawUserRow[]).map((row) => decryptRecordFields(row, ["full_name", "email"]));

  const usersRaw = usersTableMissing ? authRows : mergeUsers(dbRows, authRows);

  return {
    users: usersRaw.map(toAdminUser),
    warnings,
    usersTableMissing,
  };
};

export const getAdminDashboardData = async () => {
  const admin = createAdminClient();
  const usersResult = await getAdminUsers();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const since24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7dIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    submissionsResult,
    analyticsUsersResult,
    errorCountResult,
    messagesCountResult,
    promoCodesCountResult,
  ] = await Promise.all([
    admin
      .from("lesson_submissions")
      .select("id, user_id, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000),
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
    admin
      .from("promo_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const warnings = [...usersResult.warnings];

  const submissionsTableMissing = isMissingTableError(submissionsResult.error?.message, "lesson_submissions");
  if (submissionsResult.error && !submissionsTableMissing) {
    throw new Error(`Не удалось загрузить задания: ${submissionsResult.error.message}`);
  }
  if (submissionsTableMissing) {
    warnings.push("Таблица public.lesson_submissions не найдена: метрики по заданиям временно недоступны.");
  }

  const analyticsTableMissing = isMissingTableError(analyticsUsersResult.error?.message, "analytics_events");
  if (analyticsUsersResult.error && !analyticsTableMissing) {
    throw new Error(`Не удалось загрузить аналитику: ${analyticsUsersResult.error.message}`);
  }
  if (analyticsTableMissing) {
    warnings.push("Таблица public.analytics_events не найдена: активность пользователей считается по заданиям.");
  }

  const errorsTableMissing = isMissingTableError(errorCountResult.error?.message, "app_error_events");
  if (errorCountResult.error && !errorsTableMissing) {
    throw new Error(`Не удалось загрузить ошибки: ${errorCountResult.error.message}`);
  }

  const messagesTableMissing = isMissingTableError(messagesCountResult.error?.message, "submission_messages");
  if (messagesCountResult.error && !messagesTableMissing) {
    throw new Error(`Не удалось загрузить сообщения: ${messagesCountResult.error.message}`);
  }

  const promoCodesTableMissing = isMissingTableError(promoCodesCountResult.error?.message, "promo_codes");
  if (promoCodesCountResult.error && !promoCodesTableMissing) {
    throw new Error(`Не удалось загрузить промокоды: ${promoCodesCountResult.error.message}`);
  }

  const submissions = submissionsTableMissing ? [] : ((submissionsResult.data ?? []) as Array<{
    id: string;
    user_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>).filter((item) => isSubmissionStatus(item.status));

  const usersNewToday = usersResult.users.filter((user) => {
    if (!user.createdAt) {
      return false;
    }
    return new Date(user.createdAt).getTime() >= startOfToday.getTime();
  }).length;

  const activeUsers7d = analyticsTableMissing
    ? uniqueCount(
        submissions
          .filter((row) => new Date(row.updated_at).getTime() >= new Date(since7dIso).getTime())
          .map((row) => row.user_id),
      )
    : uniqueCount((analyticsUsersResult.data ?? []).map((row) => (row as { user_id: string | null }).user_id));

  const metrics: AdminDashboardMetrics = {
    usersTotal: usersResult.users.length,
    usersNewToday,
    submissionsPending: submissions.filter((row) =>
      row.status === "sent" || row.status === "in_review" || row.status === "needs_revision",
    ).length,
    submissionsCompleted: submissions.filter((row) => row.status === "approved").length,
    activeUsers7d,
    errors24h: errorsTableMissing ? 0 : (errorCountResult.count ?? 0),
    messages24h: messagesTableMissing ? 0 : (messagesCountResult.count ?? 0),
    activePromoCodes: promoCodesTableMissing ? 0 : (promoCodesCountResult.count ?? 0),
  };

  return {
    warnings,
    metrics,
  };
};

export const getAdminReviewData = async () => {
  const admin = createAdminClient();
  const usersResult = await getAdminUsers();

  const submissionsResult = await admin
    .from("lesson_submissions")
    .select("id, user_id, lesson_id, status, result_link, student_comment, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1200);

  const submissionsTableMissing = isMissingTableError(submissionsResult.error?.message, "lesson_submissions");
  if (submissionsResult.error && !submissionsTableMissing) {
    throw new Error(`Не удалось загрузить задания: ${submissionsResult.error.message}`);
  }

  const warnings = [...usersResult.warnings];
  if (submissionsTableMissing) {
    warnings.push("Таблица public.lesson_submissions не найдена: очередь проверки скрыта.");
    return {
      warnings,
      items: [] as AdminReviewItem[],
    };
  }

  const submissions = ((submissionsResult.data ?? []) as RawSubmissionRow[])
    .map((row) => decryptRecordFields(row, ["result_link", "student_comment"]))
    .map(toSubmission)
    .filter((item): item is LessonSubmission => Boolean(item))
    .sort(byUpdatedAtDesc);

  if (submissions.length === 0) {
    return {
      warnings,
      items: [] as AdminReviewItem[],
    };
  }

  const submissionIds = submissions.map((submission) => submission.id);
  const unresolvedLessonIds = collectUnresolvedLessonIds(submissions.map((submission) => submission.lesson_id));

  const [messagesResult, lessonReferenceResult, mediaPreviewMap] = await Promise.all([
    admin
      .from("submission_messages")
      .select("id, submission_id, author_id, author_role, message, created_at")
      .in("submission_id", submissionIds)
      .order("created_at", { ascending: true }),
    unresolvedLessonIds.length > 0
      ? admin.from("lessons").select("id, slug").in("id", unresolvedLessonIds)
      : Promise.resolve({ data: [] as LessonReferenceRow[], error: null }),
    buildSubmissionMediaPreviewMap(submissions),
  ]);

  const messagesTableMissing = isMissingTableError(messagesResult.error?.message, "submission_messages");
  if (messagesResult.error && !messagesTableMissing) {
    throw new Error(`Не удалось загрузить переписку: ${messagesResult.error.message}`);
  }
  if (messagesTableMissing) {
    warnings.push("Таблица public.submission_messages не найдена: чат временно недоступен.");
  }

  const lessonsTableMissing = isMissingTableError(lessonReferenceResult.error?.message, "lessons");
  if (lessonReferenceResult.error && !lessonsTableMissing) {
    throw new Error(`Не удалось загрузить уроки: ${lessonReferenceResult.error.message}`);
  }

  const lessonReferenceMap = buildDbLessonReferenceMap(
    ((lessonReferenceResult.data ?? []) as LessonReferenceRow[]),
  );

  const messages = messagesTableMissing
    ? []
    : ((messagesResult.data ?? []) as RawSubmissionMessageRow[])
        .map((row) => decryptRecordFields(row, ["message"]))
        .map((row) => ({
          id: row.id,
          submission_id: row.submission_id,
          author_id: row.author_id,
          author_role: row.author_role,
          message: row.message,
          created_at: row.created_at,
        } satisfies SubmissionMessage));

  const messagesBySubmission = messages.reduce<Map<string, SubmissionMessage[]>>((acc, item) => {
    const list = acc.get(item.submission_id) ?? [];
    list.push(item);
    acc.set(item.submission_id, list);
    return acc;
  }, new Map());

  const usersById = new Map(usersResult.users.map((user) => [user.id, user]));

  const items: AdminReviewItem[] = submissions.map((submission) => {
    const lesson = resolveDemoLessonFromReference(submission.lesson_id, lessonReferenceMap);
    const user = usersById.get(submission.user_id);

    return {
      id: submission.id,
      userId: submission.user_id,
      lessonId: submission.lesson_id,
      lessonTitle: cleanLessonTitle(lesson?.title ?? "Урок"),
      studentName: user?.fullName ?? null,
      studentEmail: user?.email ?? null,
      status: submission.status,
      resultLink: submission.result_link,
      studentComment: submission.student_comment,
      createdAt: submission.created_at,
      updatedAt: submission.updated_at,
      messages: messagesBySubmission.get(submission.id) ?? [],
      mediaPreview: mediaPreviewMap.get(submission.id) ?? null,
    };
  });

  return {
    warnings,
    items,
  };
};

export const getAdminTasksData = async () => {
  const reviewData = await getAdminReviewData();

  const counts = {
    sent: reviewData.items.filter((item) => item.status === "sent").length,
    inReview: reviewData.items.filter((item) => item.status === "in_review").length,
    needsRevision: reviewData.items.filter((item) => item.status === "needs_revision").length,
    approved: reviewData.items.filter((item) => item.status === "approved").length,
  };

  return {
    warnings: reviewData.warnings,
    counts,
    items: reviewData.items.slice(0, 40),
  };
};

export const getAdminPricingData = async () => {
  const admin = createAdminClient();
  const usersResult = await getAdminUsers();

  const promoCodesCountResult = await admin
    .from("promo_codes")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const promoCodesTableMissing = isMissingTableError(promoCodesCountResult.error?.message, "promo_codes");
  if (promoCodesCountResult.error && !promoCodesTableMissing) {
    throw new Error(`Не удалось загрузить промокоды: ${promoCodesCountResult.error.message}`);
  }

  const usersByTier = usersResult.users.reduce<Record<SubscriptionTier, number>>(
    (acc, user) => {
      acc[user.tier] += 1;
      return acc;
    },
    {
      newbie: 0,
      start: 0,
      max: 0,
    },
  );

  return {
    warnings: usersResult.warnings,
    usersByTier,
    activePromoCodes: promoCodesTableMissing ? 0 : (promoCodesCountResult.count ?? 0),
    yookassaConfigured: isYooKassaConfigured(),
  };
};

export const getAdminPromoCodesData = async () => {
  const admin = createAdminClient();

  const promoCodesResult = await admin
    .from("promo_codes")
    .select(
      "id, code, title, discount_type, discount_value, plan_scope, is_active, max_uses, used_count, starts_at, expires_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const promoCodesTableMissing = isMissingTableError(promoCodesResult.error?.message, "promo_codes");
  if (promoCodesResult.error && !promoCodesTableMissing) {
    throw new Error(`Не удалось загрузить промокоды: ${promoCodesResult.error.message}`);
  }

  if (promoCodesTableMissing) {
    return {
      warnings: ["Таблица public.promo_codes не найдена. Примените SQL-схему для включения промокодов."],
      promoCodesTableMissing: true,
      promoCodes: [] as AdminPromoCodeItem[],
    };
  }

  const promoCodes = ((promoCodesResult.data ?? []) as RawPromoCodeRow[]).map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    discountLabel: formatPromoDiscountLabel(item.discount_type, item.discount_value),
    planLabel: toPlanLabel(item.plan_scope),
    isActive: item.is_active,
    usageLabel: toUsageLabel(item),
    startsAt: item.starts_at,
    expiresAt: item.expires_at,
    createdAt: item.created_at,
  }));

  return {
    warnings: [] as string[],
    promoCodesTableMissing: false,
    promoCodes,
  };
};

export const getAdminMessagesData = async () => {
  const reviewData = await getAdminReviewData();

  const messages: AdminMessageItem[] = reviewData.items
    .flatMap((item) =>
      item.messages.map((message) => ({
        id: message.id,
        submissionId: item.id,
        lessonTitle: item.lessonTitle,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        authorRole: message.author_role,
        message: message.message,
        createdAt: message.created_at,
      })),
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 120);

  return {
    warnings: reviewData.warnings,
    messages,
  };
};

export const getAdminSettingsData = async () => {
  const admin = createAdminClient();

  const checks = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("lesson_submissions").select("id", { count: "exact", head: true }),
    admin.from("submission_messages").select("id", { count: "exact", head: true }),
    admin.from("admin_audit_logs").select("id", { count: "exact", head: true }),
    admin.from("analytics_events").select("id", { count: "exact", head: true }),
    admin.from("promo_codes").select("id", { count: "exact", head: true }),
    admin.from("app_error_events").select("id", { count: "exact", head: true }),
  ]);

  const tableNames = [
    "users",
    "lesson_submissions",
    "submission_messages",
    "admin_audit_logs",
    "analytics_events",
    "promo_codes",
    "app_error_events",
  ] as const;

  const tables = checks.map((result, index) => {
    const table = tableNames[index];
    const missing = isMissingTableError(result.error?.message, table);
    const status: "ready" | "missing" | "error" = missing
      ? "missing"
      : result.error
        ? "error"
        : "ready";

    return {
      table,
      status,
      message: result.error?.message ?? null,
    };
  });

  return {
    tables,
    yookassaConfigured: isYooKassaConfigured(),
  };
};

