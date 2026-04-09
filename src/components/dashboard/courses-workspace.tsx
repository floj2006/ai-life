import Link from "next/link";
import { LessonCategoryChip } from "@/components/dashboard/lesson-category-chip";
import { submissionStatusLabels } from "@/lib/submissions";
import type { LessonWithProgress, SubmissionStatus } from "@/lib/types";

type WorkspaceSubmission = {
  id: string;
  lesson_id: string;
  status: SubmissionStatus;
  student_comment: string;
  result_link: string | null;
  updated_at: string;
};

type CoursesWorkspaceProps = {
  lessons: LessonWithProgress[];
  submissions: WorkspaceSubmission[];
};

const toLocalDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function CoursesWorkspace({ lessons, submissions }: CoursesWorkspaceProps) {
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const recentResults = submissions.slice(0, 3);

  return (
    <section className="surface fade-up p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Рабочая зона</p>
          <h2 className="mt-1 text-2xl font-bold">Нейро-результаты</h2>
          <p className="small-text mt-1">
            Здесь видны последние отправленные работы и текущие статусы проверки.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-1">
          <Link
            href="/submissions?tab=active"
            className="action-button primary-button w-full sm:min-w-[220px]"
          >
            Мои задания
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {recentResults.length > 0 ? (
          recentResults.map((submission) => {
            const lesson = lessonMap.get(submission.lesson_id);
            const preview =
              submission.student_comment.trim() ||
              (submission.result_link
                ? "Файл результата прикреплен. Нажмите «Перейти в задания», чтобы открыть детали."
                : "Результат без комментария");

            return (
              <article
                key={submission.id}
                className="flex h-full flex-col rounded-2xl border border-[var(--line)] bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700">
                    {submissionStatusLabels[submission.status]}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {toLocalDate(submission.updated_at)}
                  </span>
                </div>

                {lesson ? (
                  <div className="mt-2">
                    <LessonCategoryChip category={lesson.category} />
                  </div>
                ) : null}

                <p className="mt-3 font-semibold">{lesson?.title ?? "Урок из истории"}</p>
                <p className="small-text mt-2 min-h-[72px] flex-1 text-sm [overflow-wrap:anywhere]">
                  {preview}
                </p>

                <div className="mt-auto grid gap-2 pt-3">
                  {lesson ? (
                    <Link
                      href={`/dashboard/lessons/${lesson.id}`}
                      className="action-button secondary-button w-full"
                    >
                      Открыть урок
                    </Link>
                  ) : null}
                  <Link href="/submissions?tab=active" className="action-button primary-button w-full">
                    Перейти в задания
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-4 md:col-span-3">
            <p className="font-semibold">Пока нет отправленных работ</p>
            <p className="small-text mt-1">
              Откройте любой урок и отправьте первое задание на проверку.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
