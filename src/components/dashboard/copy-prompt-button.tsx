"use client";

import { useState } from "react";

type CopyPromptButtonProps = {
  prompt: string;
};

const extractPromptOnly = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(
    /(?:^|\n)Промпт:\n([\s\S]*?)(?:\n\nЧто должно получиться:|$)/,
  );

  return match?.[1]?.trim() || normalized;
};

export function CopyPromptButton({ prompt }: CopyPromptButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractPromptOnly(prompt));
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1600);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="action-button secondary-button w-full sm:w-auto"
    >
      {status === "copied"
        ? "Скопировано"
        : status === "error"
          ? "Не удалось скопировать"
          : "Скопировать промпт"}
    </button>
  );
}
