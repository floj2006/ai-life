"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { SubmissionMessageForm } from "@/components/submissions/submission-message-form";
import { type SubmissionMediaPreview } from "@/lib/submission-media-preview";
import { isExternalResultLink, parseStorageResultLink } from "@/lib/submission-media";
import { createClient } from "@/lib/supabase/client";
import { isSubmissionStatus } from "@/lib/submissions";
import type { SubmissionMessage, SubmissionStatus } from "@/lib/types";

type SubmissionCardProps = {
  submissionId: string;
  lessonTitle: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  resultLink: string | null;
  studentComment: string;
  thread: SubmissionMessage[];
  mediaPreview: SubmissionMediaPreview | null;
};

const COMMENT_PREVIEW_LIMIT = 140;
const MESSAGE_PREVIEW_LIMIT = 120;

const statusStyles: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  sent: {
    label: "В процессе",
    className:
      "bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:ring-blue-500/30",
  },
  in_review: {
    label: "На проверке",
    className:
      "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/30",
  },
  needs_revision: {
    label: "Нужна доработка",
    className:
      "bg-orange-100 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/30",
  },
  approved: {
    label: "Принято",
    className:
      "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30",
  },
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shorten = (value: string, limit: number) => {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit).trimEnd()}...`;
};

const getLastAdminMessage = (messages: SubmissionMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.author_role === "admin") {
      return messages[index] ?? null;
    }
  }

  return null;
};

const sortMessagesByCreatedAt = (left: SubmissionMessage, right: SubmissionMessage) => {
  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
};

const hasStorageMedia = (resultLink: string | null) => {
  return Boolean(parseStorageResultLink(resultLink));
};

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" />
    <path d="M8 3v4M16 3v4M3.5 9.5h17" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v4.8l3 1.8" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3H6.5A2.5 2.5 0 0 1 4 15.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" />
  </svg>
);

const isCardActionTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("a, button, input, textarea, video, [data-card-action='true']"));
};

export function SubmissionCard({
  submissionId,
  lessonTitle,
  status,
  createdAt,
  updatedAt,
  resultLink,
  studentComment,
  thread,
  mediaPreview,
}: SubmissionCardProps) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [liveThread, setLiveThread] = useState<SubmissionMessage[]>(thread);
  const [liveStatus, setLiveStatus] = useState<SubmissionStatus>(status);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncMessages = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/messages`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        items?: SubmissionMessage[];
        status?: string | null;
      };

      if (Array.isArray(payload.items)) {
        setLiveThread(payload.items.slice().sort(sortMessagesByCreatedAt));
      }

      if (typeof payload.status === "string" && isSubmissionStatus(payload.status)) {
        setLiveStatus(payload.status);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    void syncMessages();
    const pollId = window.setInterval(() => {
      void syncMessages();
    }, 4000);

    const channel = supabase
      .channel(`submission-chat-${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submission_messages",
          filter: `submission_id=eq.${submissionId}`,
        },
        () => {
          void syncMessages();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lesson_submissions",
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          const nextStatusRaw = payload.new?.status;
          if (typeof nextStatusRaw !== "string" || !isSubmissionStatus(nextStatusRaw)) {
            return;
          }
          setLiveStatus(nextStatusRaw);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      window.clearInterval(pollId);
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [expanded, submissionId, supabase, syncMessages]);

  useEffect(() => {
    setLiveThread(thread);
  }, [thread]);

  useEffect(() => {
    setLiveStatus(status);
  }, [status]);

  const trimmedComment = studentComment.trim();
  const commentPreview = trimmedComment
    ? shorten(trimmedComment, COMMENT_PREVIEW_LIMIT)
    : "Комментарий к работе не добавлен.";
  const lastAdminMessage = getLastAdminMessage(liveThread);
  const externalLink = resultLink && isExternalResultLink(resultLink) ? resultLink : null;

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  const onSummaryClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isCardActionTarget(event.target)) {
      return;
    }

    toggleExpanded();
  };

  const onSummaryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleExpanded();
  };

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-sky-100/80 bg-white/92 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_40px_rgba(14,116,144,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onSummaryClick}
        onKeyDown={onSummaryKeyDown}
        className="grid cursor-pointer gap-4 p-4 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 md:grid-cols-[116px_minmax(0,1fr)_auto] md:items-center md:gap-5 md:p-6"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-sky-100 bg-[linear-gradient(145deg,rgba(240,249,255,0.96),rgba(224,242,254,0.74))] dark:border-slate-700 dark:bg-slate-800">
          {mediaPreview?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaPreview.url}
              alt={`Результат по уроку ${lessonTitle}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3">
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-800 dark:bg-slate-900/70 dark:text-slate-100">
                {mediaPreview?.kind === "video"
                  ? "Видео"
                  : externalLink
                    ? "Ссылка"
                    : hasStorageMedia(resultLink)
                      ? "Файл"
                      : "Задание"}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="text-xl font-semibold leading-tight text-slate-900 md:text-2xl dark:text-slate-100">
              {lessonTitle}
            </h2>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusStyles[liveStatus].className}`}
            >
              {statusStyles[liveStatus].label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <CalendarIcon />
              Отправлено: {formatDateTime(createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20">
              <ClockIcon />
              Обновлено: {formatDateTime(updatedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-slate-800 dark:text-slate-200">
              <MessageIcon />
              Сообщений: {liveThread.length}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/85 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Последний ответ проверяющего
            </p>
            <div className="mt-2 flex items-start gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">
                ПР
              </span>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {lastAdminMessage
                  ? shorten(lastAdminMessage.message, MESSAGE_PREVIEW_LIMIT)
                  : "Пока нет ответа проверяющего. Как только он появится, вы увидите его здесь."}
              </p>
            </div>

            <p className="mt-2 border-t border-slate-200/80 pt-2 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ваш комментарий: {commentPreview}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:min-w-[176px]">
          {externalLink ? (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              data-card-action="true"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-800 transition-all duration-200 ease-out hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Открыть источник
            </a>
          ) : null}

          <button
            type="button"
            data-card-action="true"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#0b4f8a,#0c8bc6)] px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,116,144,0.26)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(14,116,144,0.32)]"
          >
            {expanded ? "Скрыть детали" : "Открыть детали"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-sky-100 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/50 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="grid gap-4">
              <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  Материалы
                </p>

                {mediaPreview ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    {mediaPreview.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaPreview.url}
                        alt={`Результат по уроку ${lessonTitle}`}
                        className="h-auto max-h-[460px] w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <video
                        src={mediaPreview.url}
                        controls
                        preload="metadata"
                        className="h-auto max-h-[460px] w-full bg-black"
                      />
                    )}
                  </div>
                ) : null}

                {externalLink ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    Результат отправлен ссылкой.{" "}
                    <a
                      href={externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sky-700 dark:text-sky-300"
                    >
                      Открыть материал
                    </a>
                  </p>
                ) : null}

                {hasStorageMedia(resultLink) && !mediaPreview ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    Файл результата загружен, но превью временно недоступно.
                  </p>
                ) : null}

                {!externalLink && !hasStorageMedia(resultLink) && !mediaPreview ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    Материал пока не приложен.
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl bg-sky-50/85 p-4 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:ring-sky-500/25">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                  Комментарий к отправке
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                  {trimmedComment || "Комментарий не добавлен."}
                </p>
              </section>
            </div>

            <div className="grid gap-4">
              <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Чат с проверяющим
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {isSyncing ? "Синхронизация..." : `${liveThread.length} сообщений`}
                  </span>
                </div>

                {liveThread.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Пока нет сообщений от проверяющего.
                  </p>
                ) : (
                  <div className="mt-3 grid max-h-[320px] gap-2 overflow-y-auto pr-1">
                    {liveThread.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          item.author_role === "admin"
                            ? "bg-sky-50 dark:bg-sky-500/10"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                            {item.author_role === "admin" ? "Проверяющий" : "Вы"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                        <p className="text-slate-800 dark:text-slate-100">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-white p-1 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700">
                <SubmissionMessageForm
                  submissionId={submissionId}
                  placeholder="Коротко ответьте по этому заданию"
                  buttonLabel="Отправить сообщение"
                  refreshOnSuccess={false}
                  onSuccess={() => {
                    void syncMessages();
                  }}
                />
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
