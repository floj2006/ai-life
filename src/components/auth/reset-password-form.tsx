"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const hasRecoveryHash = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const rawHash = window.location.hash.replace(/^#/, "");
  if (!rawHash) {
    return false;
  }

  const params = new URLSearchParams(rawHash);
  return params.get("type") === "recovery";
};

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const recoveryLinkOpened = hasRecoveryHash();

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          if (mounted) {
            setError(sessionError.message);
          }
          return;
        }

        if (!mounted) {
          return;
        }

        if (data.session) {
          setCanUpdatePassword(true);
          return;
        }

        if (recoveryLinkOpened) {
          setMessage("Проверяем ссылку восстановления. Если форма не откроется, обновите страницу.");
          return;
        }

        setError("Ссылка для сброса пароля недействительна или уже использована.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setCanUpdatePassword(true);
        setError("");
        setMessage("");
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают. Проверьте ввод.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Пароль обновлен. Перенаправляем в личный кабинет...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="surface auth-form-shell mx-auto w-full max-w-md p-5 md:p-7">
        <p className="small-text">Проверяем ссылку восстановления...</p>
      </div>
    );
  }

  if (!canUpdatePassword) {
    return (
      <div className="surface auth-form-shell mx-auto w-full max-w-md p-5 md:p-7">
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error || "Не удалось открыть форму смены пароля."}
        </p>
        {message ? (
          <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm font-medium text-sky-900">
            {message}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/auth" className="action-button secondary-button w-full">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface auth-form-shell mx-auto w-full max-w-md p-5 md:p-7">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block space-y-1 fade-up" style={{ animationDelay: "0.03s" }}>
          <span className="text-sm font-semibold">Новый пароль</span>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Минимум 6 символов"
            className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-base outline-none transition focus:border-sky-600"
          />
        </label>

        <label className="block space-y-1 fade-up" style={{ animationDelay: "0.06s" }}>
          <span className="text-sm font-semibold">Повторите пароль</span>
          <input
            required
            minLength={6}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторите новый пароль"
            className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-base outline-none transition focus:border-sky-600"
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl bg-sky-50 p-3 text-sm font-medium text-sky-800">
            {message}
          </p>
        ) : null}

        <button
          disabled={isSubmitting}
          className="action-button primary-button pulse-glow w-full"
          type="submit"
        >
          {isSubmitting ? "Сохраняем..." : "Сменить пароль"}
        </button>
      </form>

      <Link href="/auth" className="mt-3 inline-block text-sm font-semibold text-sky-700 transition hover:opacity-80">
        Вернуться ко входу
      </Link>
    </div>
  );
}

