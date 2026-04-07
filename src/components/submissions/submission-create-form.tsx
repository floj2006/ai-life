"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCEPTED_SUBMISSION_FILE_TYPES,
  getSubmissionMediaKindFromMime,
  MAX_SUBMISSION_FILE_SIZE_BYTES,
  MAX_SUBMISSION_FILE_SIZE_MB,
} from "@/lib/submission-media";
import { trackClientEvent } from "@/lib/telemetry-client";

type SubmissionCreateFormProps = {
  lessonId: string;
  disabled?: boolean;
};

export function SubmissionCreateForm({ lessonId, disabled = false }: SubmissionCreateFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    if (!resultFile) {
      setStatus("error");
      setError("Добавьте изображение или видео для проверки.");
      return;
    }

    if (resultFile.size > MAX_SUBMISSION_FILE_SIZE_BYTES) {
      setStatus("error");
      setError(`Файл слишком большой. Максимум ${MAX_SUBMISSION_FILE_SIZE_MB} МБ.`);
      return;
    }

    if (!getSubmissionMediaKindFromMime(resultFile.type)) {
      setStatus("error");
      setError("Поддерживаются JPG, PNG, WEBP, HEIC, MP4, WEBM, MOV.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const formData = new FormData();
      formData.set("lessonId", lessonId);
      formData.set("comment", comment.trim());
      formData.set("resultFile", resultFile);

      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Не удалось отправить задание.");
      }

      setStatus("success");
      setComment("");
      setResultFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      trackClientEvent("submission_created", {
        lessonId,
        hasComment: Boolean(comment.trim()),
        resultType: resultFile ? getSubmissionMediaKindFromMime(resultFile.type) : null,
      });
      router.refresh();
    } catch (submissionError) {
      setStatus("error");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось отправить задание.",
      );
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[28px] bg-white/92 p-4 shadow-[0_24px_80px_rgba(13,63,107,0.08)] ring-1 ring-[var(--line)] md:p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
          Отправка на проверку
        </p>
        <p className="text-sm leading-relaxed text-zinc-600">
          Загрузите готовый результат и, если нужно, коротко напишите, на что обратить внимание.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="text-sm font-semibold text-[var(--ink)]">Файл результата</span>
          <div className="mt-2 rounded-[24px] border border-[var(--line)] bg-slate-50/80 p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_SUBMISSION_FILE_TYPES}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setResultFile(nextFile);
              }}
              className="block w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none transition file:mr-3 file:rounded-xl file:border-0 file:bg-sky-600 file:px-3 file:py-2.5 file:font-semibold file:text-white hover:file:bg-sky-500"
              disabled={disabled || status === "loading"}
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-zinc-500">
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--line)]">
                Фото или видео
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--line)]">
                До {MAX_SUBMISSION_FILE_SIZE_MB} МБ
              </span>
            </div>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--ink)]">Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например: сделал 2 варианта, нужна обратная связь по композиции и тексту."
            rows={4}
            className="mt-2 w-full rounded-[24px] border border-[var(--line)] bg-slate-50/80 px-4 py-3 text-sm leading-relaxed outline-none transition placeholder:text-zinc-400 focus:border-sky-600 focus:bg-white"
            disabled={disabled || status === "loading"}
          />
        </label>
      </div>

      {resultFile ? (
        <p className="mt-3 rounded-2xl bg-cyan-50 px-3 py-2 text-sm font-medium text-sky-800 ring-1 ring-cyan-100">
          Выбран файл: {resultFile.name}
        </p>
      ) : null}

      {status === "success" ? (
        <p className="mt-3 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-100">
          Задание отправлено. Ответ появится в разделе «Мои задания».
        </p>
      ) : null}

      {status === "error" ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          disabled={disabled || status === "loading"}
          className="action-button primary-button w-full"
        >
          {status === "loading" ? "Отправляю..." : "Отправить задание"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/submissions")}
          className="action-button secondary-button w-full"
        >
          Мои задания
        </button>
      </div>
    </form>
  );
}

