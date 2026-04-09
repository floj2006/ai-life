import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { SubmissionCard } from "@/components/submissions/submission-card";
import { SubmissionsSeenMarker } from "@/components/submissions/submissions-seen-marker";
import { isAdminEmail } from "@/lib/admin-access";
import { requireUser } from "@/lib/auth";
import {
  buildDbLessonReferenceMap,
  collectUnresolvedLessonIds,
  resolveDemoLessonFromReference,
} from "@/lib/lesson-reference";
import { cleanLessonTitle } from "@/lib/lesson-title";
import { decryptRecordFields } from "@/lib/security/encryption";
import { buildSubmissionMediaPreviewMap } from "@/lib/submission-media-preview";
import { isSubmissionStatus } from "@/lib/submissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LessonSubmission, SubmissionMessage } from "@/lib/types";

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

type SubmissionsTab = "active" | "in_review" | "needs_fix" | "accepted";

type SubmissionsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const parseTab = (value: string | undefined): SubmissionsTab => {
  if (value === "in_review" || value === "needs_fix" || value === "accepted") {
    return value;
  }

  if (value === "completed") {
    return "accepted";
  }

  return "active";
};

const tabTitles: Record<SubmissionsTab, string> = {
  active: "Активные",
  in_review: "На проверке",
  needs_fix: "Нужна доработка",
  accepted: "Принятые",
};

const EmptyTasksIllustration = () => (
  <svg viewBox="0 0 220 150" className="h-auto w-full max-w-[280px]" fill="none" aria-hidden>
    <defs>
      <linearGradient id="tasks-empty-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#DBEAFE" />
        <stop offset="100%" stopColor="#CFFAFE" />
      </linearGradient>
    </defs>
    <rect x="10" y="20" width="200" height="115" rx="18" fill="url(#tasks-empty-bg)" />
    <rect x="34" y="44" width="152" height="16" rx="8" fill="#ffffff" fillOpacity="0.85" />
    <rect x="34" y="68" width="128" height="12" rx="6" fill="#ffffff" fillOpacity="0.65" />
    <rect x="34" y="86" width="112" height="12" rx="6" fill="#ffffff" fillOpacity="0.55" />
    <circle cx="40" cy="14" r="10" fill="#38BDF8" fillOpacity="0.32" />
    <circle cx="180" cy="12" r="6" fill="#0891B2" fillOpacity="0.25" />
    <path d="M163 112l12 10 24-28" stroke="#16A34A" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  noStore();
  const params = await searchParams;
  const activeTab = parseTab(params.tab);

  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data: submissionsData, error: submissionsError } = await admin
    .from("lesson_submissions")
    .select("id, user_id, lesson_id, status, result_link, student_comment, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (submissionsError) {
    return (
      <main className="container-shell with-mobile-nav py-6">
        <div className="surface p-6">
          <h1 className="text-2xl font-bold">Мои задания</h1>
          <p className="small-text mt-2">Не удалось загрузить задания: {submissionsError.message}</p>
        </div>
      </main>
    );
  }

  const submissions = ((submissionsData ?? []) as LessonSubmission[]).map((row) =>
    decryptRecordFields(row, ["result_link", "student_comment"]),
  );
  const unresolvedLessonIds = collectUnresolvedLessonIds(
    submissions.map((item) => item.lesson_id),
  );

  const lessonReferenceResult =
    unresolvedLessonIds.length > 0
      ? await admin.from("lessons").select("id, slug").in("id", unresolvedLessonIds)
      : { data: [], error: null };
  const lessonReferenceRows = lessonReferenceResult.error
    ? []
    : ((lessonReferenceResult.data ?? []) as LessonReferenceRow[]);
  const lessonReferenceMap = buildDbLessonReferenceMap(lessonReferenceRows);

  const submissionIds = submissions.map((item) => item.id);
  const mediaPreviewPromise = buildSubmissionMediaPreviewMap(submissions);

  const messagesPromise =
    submissionIds.length > 0
      ? admin
          .from("submission_messages")
          .select("id, submission_id, author_id, author_role, message, created_at")
          .in("submission_id", submissionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const [messagesResult, mediaPreviewMap] = await Promise.all([
    messagesPromise,
    mediaPreviewPromise,
  ]);
  const messages = ((messagesResult.data ?? []) as SubmissionMessage[]).map((row) =>
    decryptRecordFields(row, ["message"]),
  );
  const messagesBySubmission = new Map<string, SubmissionMessage[]>();

  for (const message of messages) {
    const list = messagesBySubmission.get(message.submission_id) ?? [];
    list.push(message);
    messagesBySubmission.set(message.submission_id, list);
  }

  const isAdmin = isAdminEmail(user.email);
  const statusCounts = submissions.reduce<Record<"sent" | "in_review" | "needs_revision" | "approved", number>>(
    (acc, submission) => {
      const status = isSubmissionStatus(submission.status) ? submission.status : "sent";
      acc[status] += 1;
      return acc;
    },
    {
      sent: 0,
      in_review: 0,
      needs_revision: 0,
      approved: 0,
    },
  );

  const tabCounters: Record<SubmissionsTab, number> = {
    active: statusCounts.sent + statusCounts.in_review + statusCounts.needs_revision,
    in_review: statusCounts.in_review,
    needs_fix: statusCounts.needs_revision,
    accepted: statusCounts.approved,
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const status = isSubmissionStatus(submission.status) ? submission.status : "sent";

    if (activeTab === "active") {
      return status !== "approved";
    }

    if (activeTab === "in_review") {
      return status === "in_review";
    }

    if (activeTab === "needs_fix") {
      return status === "needs_revision";
    }

    return status === "approved";
  });

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      {!isAdmin ? <SubmissionsSeenMarker /> : null}

      <section className="surface surface-glow p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Рабочая зона ученика</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight md:text-4xl">Мои задания</h1>
            <p className="small-text mt-2 max-w-2xl">
              Здесь видно все отправки, текущий статус и последние ответы проверяющего.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/courses" className="action-button secondary-button">
              К курсам
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="action-button primary-button">
                Админ-панель
              </Link>
            ) : null}
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Фильтры по статусу заданий">
          {(Object.keys(tabTitles) as SubmissionsTab[]).map((tabKey) => (
            <Link
              key={tabKey}
              href={tabKey === "active" ? "/submissions" : `/submissions?tab=${tabKey}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out ${
                activeTab === tabKey
                  ? "border-sky-600 bg-sky-600 text-white shadow-[0_10px_18px_rgba(14,116,144,0.26)]"
                  : "border-sky-100 bg-white/85 text-slate-700 hover:border-sky-200 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tabTitles[tabKey]}</span>
              <span className={activeTab === tabKey ? "text-white/90" : "text-slate-500 dark:text-slate-400"}>
                ({tabCounters[tabKey]})
              </span>
            </Link>
          ))}
        </nav>
      </section>

      {filteredSubmissions.length === 0 ? (
        <section className="surface p-6 md:p-10">
          <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
            <EmptyTasksIllustration />
            <h2 className="mt-5 text-2xl font-semibold text-slate-900">Пока в этом разделе нет заданий</h2>
            <p className="small-text mt-2">
              {activeTab === "accepted"
                ? "Как только проверяющий примет работу, она появится здесь."
                : "Откройте урок и отправьте результат, чтобы задание появилось в этом списке."}
            </p>
            <Link href="/dashboard/courses" className="action-button primary-button mt-5 w-full sm:w-fit">
              Перейти к курсам
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredSubmissions.map((submission) => {
            const status = isSubmissionStatus(submission.status) ? submission.status : "sent";
            const demoLesson = resolveDemoLessonFromReference(
              submission.lesson_id,
              lessonReferenceMap,
            );
            const lessonTitle = cleanLessonTitle(demoLesson?.title ?? "Урок");
            const thread = messagesBySubmission.get(submission.id) ?? [];

            return (
              <SubmissionCard
                key={submission.id}
                submissionId={submission.id}
                lessonTitle={lessonTitle}
                status={status}
                createdAt={submission.created_at}
                updatedAt={submission.updated_at}
                resultLink={submission.result_link}
                studentComment={submission.student_comment ?? ""}
                thread={thread}
                mediaPreview={mediaPreviewMap.get(submission.id) ?? null}
              />
            );
          })}
        </section>
      )}

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}
