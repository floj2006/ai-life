"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type CompleteLessonButtonProps = {
  lessonId: string;
  completed: boolean;
  disabled?: boolean;
};

export function CompleteLessonButton({
  lessonId,
  completed,
  disabled = false,
}: CompleteLessonButtonProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggleLesson = (nextState: boolean) => {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          completed: nextState,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "Не удалось обновить прогресс.");
        return;
      }

      router.refresh();
    });
  };

  if (disabled) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        Этот урок доступен только на тарифе «Макс».
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => toggleLesson(!completed)}
        className={`action-button w-full ${
          completed ? "secondary-button" : "primary-button"
        }`}
      >
        {isPending
          ? "Сохраняю..."
          : completed
            ? "Отметить как не пройдено"
            : "Отметить как пройдено"}
      </button>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
