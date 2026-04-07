"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { SubmissionMessageForm } from "@/components/submissions/submission-message-form";
import { type SubmissionMediaPreview } from "@/lib/submission-media-preview";
import { isExternalResultLink, parseStorageResultLink } from "@/lib/submission-media";
import { createClient } from "@/lib/supabase/client";
import {
  isSubmissionStatus,
  submissionStatusClasses,
  submissionStatusLabels,
} from "@/lib/submissions";
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
const MESSAGE_PREVIEW_LIMIT = 110;

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

const toMessageFromRealtimePayload = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): SubmissionMessage | null => {
  const row = (payload.new ?? {}) as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : null;
  const submissionId = typeof row.submission_id === "string" ? row.submission_id : null;
  const authorId = typeof row.author_id === "string" ? row.author_id : null;
  const authorRoleRaw = row.author_role;
  const authorRole = authorRoleRaw === "admin" || authorRoleRaw === "student" ? authorRoleRaw : null;
  const message = typeof row.message === "string" ? row.message : null;
  const createdAt = typeof row.created_at === "string" ? row.created_at : null;

  if (!id || !submissionId || !authorId || !authorRole || !message || !createdAt) {
    return null;
  }

  return {
    id,
    submission_id: submissionId,
    author_id: authorId,
    author_role: authorRole,
    message,
    created_at: createdAt,
  };
};

const hasStorageMedia = (resultLink: string | null) => {
  return Boolean(parseStorageResultLink(resultLink));
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
        (payload) => {
          const nextMessage = toMessageFromRealtimePayload(payload);
          if (!nextMessage) {
            return;
          }

          setLiveThread((prev) => {
            if (prev.some((item) => item.id === nextMessage.id)) {
              return prev;
            }

            return [...prev, nextMessage].sort(sortMessagesByCreatedAt);
          });
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

  return (
    <article className="surface overflow-hidden p-0">
      <div className="grid gap-4 p-4 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center md:p-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,rgba(240,249,255,0.96),rgba(224,242,254,0.74))] ring-1 ring-sky-100">
          {mediaPreview?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaPreview.url}
              alt={`Результат по уроку ${lessonTitle}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col justify-between p-3">
              <span className="w-fit rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700 ring-1 ring-sky-100">
                {mediaPreview?.kind === "video"
                  ? "Видео"
                  : externalLink
                    ? "Ссылка"
                    : hasStorageMedia(resultLink)
                      ? "Файл"
                      : "Задание"}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {mediaPreview?.kind === "video"
                    ? "Видео-результат готов к просмотру"
                    : externalLink
                      ? "Результат отправлен ссылкой"
                      : hasStorageMedia(resultLink)
                        ? "Файл загружен в платформу"
                        : "Материал пока без превью"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  {mediaPreview?.kind === "video"
                    ? "Откройте детали, чтобы посмотреть ролик и переписку."
                    : "Разверните карточку, чтобы посмотреть детали и ответить."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold leading-tight md:text-2xl">{lessonTitle}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${submissionStatusClasses[liveStatus]}`}
            >
              {submissionStatusLabels[liveStatus]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Отправлено: {formatDateTime(createdAt)}
            </span>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900 ring-1 ring-cyan-100">
              Обновлено: {formatDateTime(updatedAt)}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              Сообщений: {liveThread.length}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-zinc-700">{commentPreview}</p>

          {lastAdminMessage ? (
            <div className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                Последний ответ проверяющего
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
                {shorten(lastAdminMessage.message, MESSAGE_PREVIEW_LIMIT)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 md:min-w-[170px]">
          {externalLink ? (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="action-button secondary-button w-full"
            >
              Открыть ссылку
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="action-button primary-button w-full"
          >
            {expanded ? "Скрыть детали" : "Открыть детали"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="grid gap-4">
              <section className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-[var(--line)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                  Материалы
                </p>

                {mediaPreview ? (
                  <div className="mt-3 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white">
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
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
                    Результат отправлен ссылкой. {" "}
                    <a
                      href={externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sky-700"
                    >
                      Открыть материал
                    </a>
                  </p>
                ) : null}

                {hasStorageMedia(resultLink) && !mediaPreview ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700">
                    Файл результата загружен, но превью временно недоступно.
                  </p>
                ) : null}

                {!externalLink && !hasStorageMedia(resultLink) && !mediaPreview ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700">
                    Материал пока не приложен.
                  </p>
                ) : null}
              </section>

              <section className="rounded-[24px] bg-cyan-50 p-4 ring-1 ring-cyan-100">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                  Комментарий к отправке
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
                  {trimmedComment || "Комментарий не добавлен."}
                </p>
              </section>
            </div>

            <div className="grid gap-4">
              <section className="rounded-[24px] bg-white p-4 ring-1 ring-[var(--line)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                    Чат с проверяющим
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {isSyncing ? "Синхронизация..." : `${liveThread.length} сообщений`}
                  </span>
                </div>

                {liveThread.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    Пока нет сообщений от проверяющего.
                  </p>
                ) : (
                  <div className="mt-3 grid max-h-[320px] gap-2 overflow-y-auto pr-1">
                    {liveThread.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          item.author_role === "admin" ? "bg-sky-50" : "bg-slate-100"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                            {item.author_role === "admin" ? "Проверяющий" : "Вы"}
                          </p>
                          <p className="text-xs text-zinc-500">{formatDateTime(item.created_at)}</p>
                        </div>
                        <p>{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[24px] bg-white p-1 ring-1 ring-[var(--line)]">
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
