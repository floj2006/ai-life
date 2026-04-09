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
import { isSubmissionStatus, submissionStatusLabels } from "@/lib/submissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LessonSubmission, SubmissionMessage } from "@/lib/types";

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

type SubmissionsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  noStore();
  const params = await searchParams;
  const tab = params.tab === "completed" ? "completed" : "active";

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

  const submissions = (submissionsData ?? []).map((row) =>
    decryptRecordFields(row as Record<string, unknown>, ["result_link", "student_comment"]),
  ) as LessonSubmission[];
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
  const messages = (messagesResult.data ?? []).map((row) =>
    decryptRecordFields(row as Record<string, unknown>, ["message"]),
  ) as SubmissionMessage[];
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
  const filteredSubmissions = submissions.filter((submission) => {
    const status = isSubmissionStatus(submission.status) ? submission.status : "sent";
    return tab === "completed" ? status === "approved" : status !== "approved";
  });

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      {!isAdmin ? <SubmissionsSeenMarker /> : null}
      <section className="surface p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Мои задания</h1>
            <p className="small-text mt-2">
              Здесь собраны все отправки, ответы проверяющего и текущие статусы по урокам.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/courses" className="action-button secondary-button">
              К урокам
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="action-button primary-button">
                Админ-панель
              </Link>
            ) : null}
          </div>
        </div>

        {submissions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/submissions?tab=active"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tab === "active"
                  ? "bg-sky-600 text-white"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              Активные
            </Link>
            <Link
              href="/submissions?tab=completed"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tab === "completed"
                  ? "bg-sky-600 text-white"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              Принятые
            </Link>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              Всего: {submissions.length}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {submissionStatusLabels.sent}: {statusCounts.sent}
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {submissionStatusLabels.in_review}: {statusCounts.in_review}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {submissionStatusLabels.needs_revision}: {statusCounts.needs_revision}
            </span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              {submissionStatusLabels.approved}: {statusCounts.approved}
            </span>
          </div>
        ) : null}
      </section>

      {filteredSubmissions.length === 0 ? (
        <section className="surface p-6">
          <p className="small-text">
            {tab === "completed"
              ? "Пока нет принятых заданий."
              : "Пока нет активных заданий. Откройте урок и нажмите «Отправить задание»."}
          </p>
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

