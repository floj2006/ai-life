"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getReviewTemplatesForStatus } from "@/lib/review-templates";
import type { SubmissionStatus } from "@/lib/types";

type SubmissionStatusFormProps = {
  submissionId: string;
  currentStatus: SubmissionStatus;
};

const STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: "sent", label: "Новая" },
  { value: "in_review", label: "На проверке" },
  { value: "needs_revision", label: "Нужна доработка" },
  { value: "approved", label: "Принято" },
];

const QUICK_STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: "in_review", label: "На проверке" },
  { value: "needs_revision", label: "Нужна доработка" },
  { value: "approved", label: "Принято" },
];

const REVIEW_SCROLL_KEY = "review-scroll-y";

export function SubmissionStatusForm({
  submissionId,
  currentStatus,
}: SubmissionStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SubmissionStatus>(currentStatus);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const templates = useMemo(() => getReviewTemplatesForStatus(status), [status]);

  useEffect(() => {
    const raw = sessionStorage.getItem(REVIEW_SCROLL_KEY);
    if (!raw) {
      return;
    }

    sessionStorage.removeItem(REVIEW_SCROLL_KEY);
    const top = Number(raw);

    if (Number.isNaN(top)) {
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "auto" });
    });
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setState("loading");
    setError("");

    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          message: comment.trim(),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Не удалось обновить статус.");
      }

      sessionStorage.setItem(REVIEW_SCROLL_KEY, String(window.scrollY));
      setComment("");
      setState("idle");
      router.refresh();
    } catch (statusError) {
      setState("error");
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Не удалось обновить статус.",
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl bg-white p-3 ring-1 ring-[var(--line)]">
      <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Проверка</p>

      <div className="mt-2">
        <p className="text-sm font-semibold">Быстрый статус</p>
        <div className="mt-2 grid gap-2">
          {QUICK_STATUS_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              disabled={state === "loading"}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                status === item.value
                  ? "border-sky-600 bg-sky-50 text-sky-800"
                  : "border-[var(--line)] bg-white text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="mt-2 block text-xs font-medium text-zinc-500">
          Дополнительно (полный список статусов)
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as SubmissionStatus)}
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none transition focus:border-sky-600"
            disabled={state === "loading"}
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {templates.length > 0 ? (
        <div className="mt-2">
          <p className="text-sm font-semibold">Шаблоны ответа</p>
          <div className="mt-2 grid gap-2">
            {templates.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-cyan-50 px-3 py-2"
              >
                <p className="text-sm font-medium text-[var(--ink)]">{item.label}</p>
                <button
                  type="button"
                  disabled={state === "loading"}
                  onClick={() => setComment(item.message)}
                  className="rounded-lg border border-sky-300 bg-white px-3 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-50"
                >
                  Вставить
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <label className="mt-2 block text-sm font-semibold">
        Комментарий ученику
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Что улучшить или что понравилось"
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-600"
          disabled={state === "loading"}
        />
      </label>

      {state === "error" ? (
        <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={state === "loading"}
        className="action-button primary-button mt-3 w-full"
      >
        {state === "loading" ? "Сохраняю..." : "Обновить статус"}
      </button>
    </form>
  );
}
