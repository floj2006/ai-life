"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackClientEvent } from "@/lib/telemetry-client";

type Mode = "signin" | "signup" | "forgot";

const RESET_COOLDOWN_KEY = "auth_reset_password_cooldown_until";
const RESET_COOLDOWN_SECONDS = 60;

const isLocalHostname = (hostname: string) => {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  );
};

const resolveAppUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const normalizedEnvUrl =
    envUrl && /^https?:\/\//.test(envUrl) ? envUrl.replace(/\/+$/, "") : "";

  if (typeof window !== "undefined") {
    const browserOrigin = window.location.origin.replace(/\/+$/, "");

    if (!normalizedEnvUrl) {
      return browserOrigin;
    }

    try {
      const envHost = new URL(normalizedEnvUrl).hostname;
      if (isLocalHostname(envHost)) {
        return browserOrigin;
      }
    } catch {
      return browserOrigin;
    }

    return normalizedEnvUrl;
  }

  return normalizedEnvUrl;
};

const toReadableAuthError = (message: string, mode: Mode) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("email rate limit exceeded")
  ) {
    return mode === "forgot"
      ? "Слишком много запросов на отправку письма. Подождите немного и попробуйте снова."
      : "Слишком много попыток. Подождите немного и попробуйте снова.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }

  return message;
};

export function AuthForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<Mode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(RESET_COOLDOWN_KEY);
    if (!stored) {
      return;
    }

    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      setCooldownUntil(parsed);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const cooldownSecondsLeft = Math.max(
    0,
    Math.ceil((cooldownUntil - nowTs) / 1000),
  );

  const isForgotCooldown = mode === "forgot" && cooldownSecondsLeft > 0;

  const startResetCooldown = () => {
    const nextAt = Date.now() + RESET_COOLDOWN_SECONDS * 1000;
    setCooldownUntil(nextAt);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(RESET_COOLDOWN_KEY, String(nextAt));
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setMessage("");

    if (nextMode !== "signup") {
      setFullName("");
    }

    if (nextMode === "forgot") {
      setPassword("");
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const appUrl = resolveAppUrl();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: appUrl ? `${appUrl}/auth` : undefined,
          },
        });

        if (signUpError) {
          setError(toReadableAuthError(signUpError.message, mode));
          return;
        }

        if (!data.session) {
          trackClientEvent("auth_signup_success", {
            mode: "signup",
            hasSession: false,
          });
          setMessage(
            "Аккаунт создан. Подтвердите email в письме и затем войдите в кабинет.",
          );
          setMode("signin");
          setFullName("");
          setPassword("");
          return;
        }

        trackClientEvent("auth_signup_success", {
          mode: "signup",
          hasSession: true,
        });
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(toReadableAuthError(signInError.message, mode));
          return;
        }

        trackClientEvent("auth_signin_success", {
          mode: "signin",
        });
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (isForgotCooldown) {
        setError(`Повторная отправка будет доступна через ${cooldownSecondsLeft} сек.`);
        return;
      }

      const redirectTo = appUrl ? `${appUrl}/reset-password` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        const friendly = toReadableAuthError(resetError.message, mode);
        setError(friendly);

        if (friendly.toLowerCase().includes("слишком много")) {
          startResetCooldown();
        }
        return;
      }

      startResetCooldown();
      trackClientEvent("auth_password_reset_requested", {
        mode: "forgot",
      });
      setMessage(
        "Мы отправили письмо со ссылкой для сброса пароля. Проверьте почту и папку Спам.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface auth-form-shell mx-auto w-full max-w-md p-5 md:p-7">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-cyan-50 p-1">
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`rounded-xl py-3 text-base font-semibold transition ${
            mode === "signup"
              ? "bg-white text-sky-900 shadow-sm"
              : "text-sky-800/70"
          }`}
        >
          Регистрация
        </button>
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`rounded-xl py-3 text-base font-semibold transition ${
            mode === "signin" || mode === "forgot"
              ? "bg-white text-sky-900 shadow-sm"
              : "text-sky-800/70"
          }`}
        >
          Вход
        </button>
      </div>

      {mode === "forgot" ? (
        <p className="mb-3 rounded-xl bg-cyan-50 p-3 text-sm font-medium text-sky-900">
          Восстановление пароля: введите email, и мы отправим ссылку для смены пароля.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <label className="block space-y-1 fade-up" style={{ animationDelay: "0.03s" }}>
            <span className="text-sm font-semibold">Имя</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Например: Анна"
              className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-base outline-none transition focus:border-sky-600"
            />
          </label>
        )}

        <label className="block space-y-1 fade-up" style={{ animationDelay: "0.05s" }}>
          <span className="text-sm font-semibold">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            className="h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-base outline-none transition focus:border-sky-600"
          />
        </label>

        {mode !== "forgot" ? (
          <label className="block space-y-1 fade-up" style={{ animationDelay: "0.08s" }}>
            <span className="text-sm font-semibold">Пароль</span>
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
        ) : null}

        {mode === "forgot" && isForgotCooldown ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Новое письмо можно отправить через {cooldownSecondsLeft} сек.
          </p>
        ) : null}

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
          disabled={isLoading || isForgotCooldown}
          className="action-button primary-button pulse-glow w-full"
          type="submit"
        >
          {isLoading
            ? "Подождите..."
            : mode === "signup"
              ? "Создать аккаунт"
              : mode === "signin"
                ? "Войти в кабинет"
                : isForgotCooldown
                  ? `Повторить через ${cooldownSecondsLeft} сек`
                  : "Отправить ссылку для сброса"}
        </button>
      </form>

      {mode === "signin" ? (
        <button
          type="button"
          onClick={() => switchMode("forgot")}
          className="mt-3 text-sm font-semibold text-sky-700 transition hover:opacity-80"
        >
          Забыли пароль?
        </button>
      ) : null}

      {mode === "forgot" ? (
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className="mt-3 text-sm font-semibold text-sky-700 transition hover:opacity-80"
        >
          Вернуться ко входу
        </button>
      ) : null}
    </div>
  );
}

