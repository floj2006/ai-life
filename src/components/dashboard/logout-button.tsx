"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  tone?: "secondary" | "danger";
  className?: string;
};

export function LogoutButton({ tone = "secondary", className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);

  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-sky-300 hover:text-sky-800";

  const composedClassName = [
    "inline-flex h-11 w-full items-center justify-center rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
    toneClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={composedClassName}
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <span>{isLoading ? "Выход..." : "Выйти"}</span>
    </button>
  );
}
