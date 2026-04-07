"use client";

import { useState } from "react";
import { trackClientEvent } from "@/lib/telemetry-client";

type CopyRequisitesButtonProps = {
  text: string;
};

export function CopyRequisitesButton({ text }: CopyRequisitesButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      trackClientEvent("billing_requisites_copied", {
        source: "billing",
      });
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1300);
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
          : "Скопировать реквизиты"}
    </button>
  );
}
