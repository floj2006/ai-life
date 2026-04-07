"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SubmissionMessageFormProps = {
  submissionId: string;
  placeholder?: string;
  buttonLabel?: string;
  disabled?: boolean;
  refreshOnSuccess?: boolean;
  onSuccess?: (message: string) => void;
};

export function SubmissionMessageForm({
  submissionId,
  placeholder = "Напишите сообщение",
  buttonLabel = "Отправить сообщение",
  disabled = false,
  refreshOnSuccess = true,
  onSuccess,
}: SubmissionMessageFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const REQUEST_TIMEOUT_MS = 20_000;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(`/api/submissions/${submissionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const rawText = await response.text();
        let apiError = "Не удалось отправить сообщение.";
        try {
          const data = JSON.parse(rawText) as { error?: string };
          apiError = data.error ?? apiError;
        } catch {
          if (rawText.trim()) {
            apiError = rawText;
          }
        }
        throw new Error(apiError);
      }

      setMessage("");
      setStatus("idle");
      onSuccess?.(trimmed);
      if (refreshOnSuccess) {
        router.refresh();
      }
    } catch (messageError) {
      if (messageError instanceof DOMException && messageError.name === "AbortError") {
        setStatus("error");
        setError("Сервер отвечает слишком долго. Проверьте интернет и попробуйте снова.");
        return;
      }

      setStatus("error");
      setError(
        messageError instanceof Error
          ? messageError.message
          : "Не удалось отправить сообщение.",
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-3 rounded-xl bg-white p-3 ring-1 ring-[var(--line)]">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-600"
        disabled={disabled || status === "loading"}
      />

      {status === "error" ? (
        <p className="mt-2 rounded-xl bg-red-50 p-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={disabled || status === "loading"}
        className="action-button primary-button mt-2 w-full sm:w-auto"
      >
        {status === "loading" ? "Отправляю..." : buttonLabel}
      </button>
    </form>
  );
}

