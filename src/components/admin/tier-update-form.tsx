"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionTier } from "@/lib/types";

type TierUpdateFormProps = {
  userId: string;
  currentTier: SubscriptionTier;
};

export function TierUpdateForm({ userId, currentTier }: TierUpdateFormProps) {
  const router = useRouter();
  const [tier, setTier] = useState<SubscriptionTier>(currentTier);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("saving");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Не удалось обновить тариф.");
      }

      setState("idle");
      router.refresh();
    } catch (updateError) {
      setState("error");
      setError(
        updateError instanceof Error ? updateError.message : "Не удалось обновить тариф.",
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={tier}
        onChange={(event) => setTier(event.target.value as SubscriptionTier)}
        className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold"
        disabled={state === "saving"}
      >
        <option value="newbie">Newbie</option>
        <option value="start">Start</option>
        <option value="max">Max</option>
      </select>

      <button
        type="submit"
        disabled={state === "saving"}
        className="action-button primary-button w-full sm:w-auto"
      >
        {state === "saving" ? "Сохраняю..." : "Выдать тариф"}
      </button>

      {state === "error" ? (
        <p className="text-sm font-medium text-red-700">{error}</p>
      ) : null}
    </form>
  );
}
