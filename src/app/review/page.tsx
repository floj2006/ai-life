import Link from "next/link";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { ReviewBoard, type ReviewSubmissionItem } from "@/components/review/review-board";
import { requireAdminUser } from "@/lib/admin-access";
import {
  buildDbLessonReferenceMap,
  collectUnresolvedLessonIds,
  resolveDemoLessonFromReference,
} from "@/lib/lesson-reference";
import { cleanLessonTitle } from "@/lib/lesson-title";
import { buildSubmissionMediaPreviewMap } from "@/lib/submission-media-preview";
import { isSubmissionStatus } from "@/lib/submissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LessonSubmission, SubmissionMessage } from "@/lib/types";

type UserMeta = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

const isMissingTableError = (message: string, table: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") &&
    normalized.includes(`public.${table}`)
  );
};

const MissingTableHint = ({ table }: { table: string }) => {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        В Supabase не найдена таблица <code>public.{table}</code>.
      </p>
      <p className="small-text mt-2">
        Выполните SQL из <code>supabase/schema.sql</code> в SQL Editor, затем запустите:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-sm">
{`NOTIFY pgrst, 'reload schema';`}
      </pre>
    </div>
  );
};

const AdminNav = () => <MobileBottomNav isAdmin />;

export default async function ReviewPage() {
  await requireAdminUser();
  const admin = createAdminClient();

  const { data: submissionsData, error: submissionsError } = await admin
    .from("lesson_submissions")
    .select("id, user_id, lesson_id, status, result_link, student_comment, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (submissionsError) {
    const missingSubmissionsTable = isMissingTableError(
      submissionsError.message,
      "lesson_submissions",
    );

    return (
      <main className="container-shell with-mobile-nav py-6">
        <div className="surface p-6">
          <h1 className="text-2xl font-bold">Проверка заданий</h1>
          <p className="small-text mt-2">
            Не удалось загрузить задания: {submissionsError.message}
          </p>
          {missingSubmissionsTable ? <MissingTableHint table="lesson_submissions" /> : null}
        </div>
        <AdminNav />
      </main>
    );
  }

  const submissions = (submissionsData ?? []) as LessonSubmission[];
  const userIds = [...new Set(submissions.map((item) => item.user_id))];
  const submissionIds = [...new Set(submissions.map((item) => item.id))];
  const unresolvedLessonIds = collectUnresolvedLessonIds(
    submissions.map((item) => item.lesson_id),
  );
  const mediaPreviewPromise = buildSubmissionMediaPreviewMap(submissions);

  const usersPromise =
    userIds.length > 0
      ? admin.from("users").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as UserMeta[], error: null });

  const messagesPromise =
    submissionIds.length > 0
      ? admin
          .from("submission_messages")
          .select("id, submission_id, author_id, author_role, message, created_at")
          .in("submission_id", submissionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as SubmissionMessage[], error: null });

  const lessonReferencePromise =
    unresolvedLessonIds.length > 0
      ? admin.from("lessons").select("id, slug").in("id", unresolvedLessonIds)
      : Promise.resolve({ data: [] as LessonReferenceRow[], error: null });

  const [usersResult, messagesResult, lessonReferenceResult, mediaPreviewMap] = await Promise.all([
    usersPromise,
    messagesPromise,
    lessonReferencePromise,
    mediaPreviewPromise,
  ]);

  const queryError = usersResult.error ?? messagesResult.error ?? lessonReferenceResult.error;
  if (queryError) {
    const missingUsersTable = isMissingTableError(queryError.message, "users");
    const missingMessagesTable = isMissingTableError(queryError.message, "submission_messages");
    const missingLessonsTable = isMissingTableError(queryError.message, "lessons");

    return (
      <main className="container-shell with-mobile-nav py-6">
        <div className="surface p-6">
          <h1 className="text-2xl font-bold">Проверка заданий</h1>
          <p className="small-text mt-2">
            Не удалось загрузить данные: {queryError.message}
          </p>
          {missingUsersTable ? <MissingTableHint table="users" /> : null}
          {missingMessagesTable ? <MissingTableHint table="submission_messages" /> : null}
          {missingLessonsTable ? <MissingTableHint table="lessons" /> : null}
        </div>
        <AdminNav />
      </main>
    );
  }

  const users = (usersResult.data ?? []) as UserMeta[];
  const messages = (messagesResult.data ?? []) as SubmissionMessage[];
  const lessonReferenceRows = (lessonReferenceResult.data ?? []) as LessonReferenceRow[];
  const lessonReferenceMap = buildDbLessonReferenceMap(lessonReferenceRows);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const messagesBySubmission = new Map<string, SubmissionMessage[]>();

  for (const message of messages) {
    const list = messagesBySubmission.get(message.submission_id) ?? [];
    list.push(message);
    messagesBySubmission.set(message.submission_id, list);
  }

  const reviewItems: ReviewSubmissionItem[] = submissions.map((submission) => {
    const status = isSubmissionStatus(submission.status) ? submission.status : "sent";
    const student = userMap.get(submission.user_id);
    const demoLesson = resolveDemoLessonFromReference(submission.lesson_id, lessonReferenceMap);

    return {
      id: submission.id,
      userId: submission.user_id,
      lessonId: submission.lesson_id,
      lessonTitle: cleanLessonTitle(demoLesson?.title ?? "Урок"),
      studentName: student?.full_name ?? null,
      studentEmail: student?.email ?? null,
      status,
      resultLink: submission.result_link,
      studentComment: submission.student_comment ?? "",
      createdAt: submission.created_at,
      updatedAt: submission.updated_at,
      messages: messagesBySubmission.get(submission.id) ?? [],
      mediaPreview: mediaPreviewMap.get(submission.id) ?? null,
    };
  });

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">Проверка заданий</h1>
            <p className="small-text mt-2">
              Очередь разделена на новые, текущие и завершенные задания. Внутри карточки можно быстро
              посмотреть медиа, прочитать комментарий ученика, сменить статус и сразу ответить.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard" className="action-button secondary-button">
              В кабинет
            </Link>
            <Link href="/admin" className="action-button secondary-button">
              Админ-панель
            </Link>
            <Link href="/submissions" className="action-button secondary-button">
              Мои задания
            </Link>
          </div>
        </div>
      </section>

      {reviewItems.length === 0 ? (
        <section className="surface p-6">
          <p className="small-text">Новых заданий пока нет.</p>
        </section>
      ) : (
        <ReviewBoard items={reviewItems} />
      )}

      <AdminNav />
    </main>
  );
}

