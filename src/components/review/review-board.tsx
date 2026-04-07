"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { SubmissionMessageForm } from "@/components/submissions/submission-message-form";
import { createClient } from "@/lib/supabase/client";
import { SubmissionStatusForm } from "@/components/submissions/submission-status-form";
import { isExternalResultLink, parseStorageResultLink } from "@/lib/submission-media";
import { submissionStatusClasses, submissionStatusLabels } from "@/lib/submissions";
import type { SubmissionMessage, SubmissionStatus } from "@/lib/types";

export type ReviewSubmissionItem = {
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

type ReviewBoardProps = {
  items: ReviewSubmissionItem[];
};

type ReviewSectionKey = "new" | "work" | "done";

const SECTION_CONFIG: Array<{
  key: ReviewSectionKey;
  title: string;
  statuses: SubmissionStatus[];
}> = [
  { key: "new", title: "Новые", statuses: ["sent"] },
  { key: "work", title: "В работе", statuses: ["in_review", "needs_revision"] },
  { key: "done", title: "Завершенные", statuses: ["approved"] },
];

const FILTER_ALL = "all";

const initialOpenState: Record<ReviewSectionKey, boolean> = {
  new: true,
  work: false,
  done: false,
};

const initialFilters: Record<ReviewSectionKey, string> = {
  new: FILTER_ALL,
  work: FILTER_ALL,
  done: FILTER_ALL,
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const byNewest = (left: ReviewSubmissionItem, right: ReviewSubmissionItem) => {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
};

const hasStorageMedia = (resultLink: string | null) => {
  return Boolean(parseStorageResultLink(resultLink));
};

const getLessonOptions = (rows: ReviewSubmissionItem[]) => {
  const lessonMap = new Map<string, string>();

  rows.forEach((item) => {
    if (!lessonMap.has(item.lessonId)) {
      lessonMap.set(item.lessonId, item.lessonTitle);
    }
  });

  return [...lessonMap.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title, "ru"));
};

export function ReviewBoard({ items }: ReviewBoardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [openSections, setOpenSections] =
    useState<Record<ReviewSectionKey, boolean>>(initialOpenState);
  const [filters, setFilters] = useState<Record<ReviewSectionKey, string>>(initialFilters);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;

    const scheduleRefresh = () => {
      if (disposed || refreshTimer) {
        return;
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!disposed) {
          router.refresh();
        }
      }, 900);
    };

    channel = supabase
      .channel("review-live-board")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submission_messages" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lesson_submissions" },
        scheduleRefresh,
      )
      .subscribe();

    const fallbackPollId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        scheduleRefresh();
      }
    }, 15000);

    return () => {
      disposed = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      clearInterval(fallbackPollId);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router, supabase]);

  const sectionData = useMemo(() => {
    return SECTION_CONFIG.map((section) => {
      const rows = items
        .filter((item) => section.statuses.includes(item.status))
        .sort(byNewest);

      const lessonOptions = getLessonOptions(rows);
      const filterValue = filters[section.key];

      const visibleRows =
        filterValue === FILTER_ALL
          ? rows
          : rows.filter((item) => item.lessonId === filterValue);

      return {
        ...section,
        total: rows.length,
        lessonOptions,
        visibleRows,
      };
    });
  }, [filters, items]);

  return (
    <section className="grid gap-4">
      {sectionData.map((section) => {
        const isOpen = openSections[section.key];

        return (
          <article key={section.key} className="surface p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{section.title}</h2>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                  {section.total}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
                }
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
              >
                {isOpen ? "Свернуть" : "Открыть"}
              </button>
            </div>

            <p className="small-text mt-2">
              Статусы секции:{" "}
              {section.statuses.map((status) => submissionStatusLabels[status]).join(" / ")}
            </p>

            {isOpen ? (
              <div className="mt-4">
                <label className="block text-sm font-semibold">
                  Фильтр по уроку
                  <select
                    value={filters[section.key]}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, [section.key]: event.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none transition focus:border-sky-600 md:max-w-md"
                  >
                    <option value={FILTER_ALL}>Все уроки</option>
                    {section.lessonOptions.map((lessonOption) => (
                      <option key={`${section.key}-${lessonOption.id}`} value={lessonOption.id}>
                        {lessonOption.title}
                      </option>
                    ))}
                  </select>
                </label>

                {section.visibleRows.length === 0 ? (
                  <p className="small-text mt-4">В этой секции пока нет заданий.</p>
                ) : (
                  <div className="mt-4 grid gap-4">
                    {section.visibleRows.map((submission) => (
                      <article
                        key={submission.id}
                        className="rounded-2xl bg-white p-4 ring-1 ring-[var(--line)] md:p-6"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{submission.lessonTitle}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${submissionStatusClasses[submission.status]}`}
                          >
                            {submissionStatusLabels[submission.status]}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                            Обновлено: {formatDateTime(submission.updatedAt)}
                          </span>
                        </div>

                        <p className="small-text mt-2">
                          Ученик:{" "}
                          <span className="font-semibold text-[var(--ink)]">
                            {submission.studentName || "Без имени"}
                          </span>
                          {submission.studentEmail ? ` (${submission.studentEmail})` : ""}
                        </p>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_1fr] xl:items-start">
                          <div className="grid gap-3">
                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-[var(--line)]">
                              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                                Медиа результата
                              </p>
                              <p className="small-text mt-1">
                                Отправлено: {formatDateTime(submission.createdAt)}
                              </p>

                              {submission.mediaPreview ? (
                                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                                  {submission.mediaPreview.kind === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={submission.mediaPreview.url}
                                      alt={`Результат ученика по уроку ${submission.lessonTitle}`}
                                      className="h-auto w-full"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <video
                                      src={submission.mediaPreview.url}
                                      controls
                                      preload="metadata"
                                      className="h-auto w-full"
                                    />
                                  )}
                                </div>
                              ) : null}

                              {submission.resultLink && isExternalResultLink(submission.resultLink) ? (
                                <p className="small-text mt-2">
                                  Результат:{" "}
                                  <a
                                    href={submission.resultLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-sky-700"
                                  >
                                    открыть ссылку
                                  </a>
                                </p>
                              ) : null}

                              {submission.resultLink &&
                              hasStorageMedia(submission.resultLink) &&
                              !submission.mediaPreview ? (
                                <p className="small-text mt-2">
                                  Файл результата загружен. Превью временно недоступно.
                                </p>
                              ) : null}
                            </div>

                            <div className="rounded-xl bg-cyan-50 p-3 ring-1 ring-cyan-100">
                              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                                Комментарий ученика
                              </p>
                              <p className="mt-2 text-sm leading-relaxed">
                                {submission.studentComment || "Комментарий не добавлен."}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 xl:sticky xl:top-4">
                            <SubmissionStatusForm
                              submissionId={submission.id}
                              currentStatus={submission.status}
                            />

                            <div className="rounded-xl bg-white p-3 ring-1 ring-[var(--line)]">
                              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                                Переписка
                              </p>
                              {submission.messages.length === 0 ? (
                                <p className="small-text mt-2">
                                  По этому заданию еще нет сообщений.
                                </p>
                              ) : (
                                <div className="mt-2 grid gap-2">
                                  {submission.messages.map((item) => (
                                    <div
                                      key={item.id}
                                      className={`rounded-xl p-3 text-sm leading-relaxed ${
                                        item.author_role === "admin" ? "bg-sky-50" : "bg-slate-100"
                                      }`}
                                    >
                                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-600">
                                        {item.author_role === "admin" ? "Вы" : "Ученик"}
                                      </p>
                                      <p>{item.message}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <SubmissionMessageForm
                                submissionId={submission.id}
                                placeholder="Ответ ученику"
                                buttonLabel="Отправить ответ"
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
