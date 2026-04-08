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
      setError(updateError instanceof Error ? updateError.message : "Не удалось обновить тариф.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex min-w-[220px] flex-col gap-2 sm:min-w-[260px] sm:flex-row sm:items-center">
      <select
        value={tier}
        onChange={(event) => setTier(event.target.value as SubscriptionTier)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-sky-300 focus:outline-none"
        disabled={state === "saving"}
      >
        <option value="newbie">Новичок</option>
        <option value="start">Старт</option>
        <option value="max">Макс</option>
      </select>

      <button
        type="submit"
        disabled={state === "saving"}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "saving" ? "Сохраняю..." : "Сохранить"}
      </button>

      {state === "error" ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </form>
  );
}
