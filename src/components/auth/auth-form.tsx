"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackClientEvent } from "@/lib/telemetry-client";

type Mode = "signin" | "signup" | "forgot";

const RESET_COOLDOWN_KEY = "auth_reset_password_cooldown_until";
const RESET_COOLDOWN_SECONDS = 60;
const VK_PROVIDER_CANDIDATES = ["custom:vkid", "custom:vk", "vkid", "vk"] as const;
const VKID_SDK_URL = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
const VKID_SDK_SCRIPT_ID = "vkid-sdk-script";

type VkidSdk = {
  Config: {
    init: (config: {
      app: number;
      redirectUrl: string;
      responseMode: unknown;
      source: unknown;
      scope?: string;
    }) => void;
  };
  ConfigResponseMode: {
    Callback: unknown;
  };
  ConfigSource: {
    LOWCODE: unknown;
  };
  Auth: {
    login: () => Promise<unknown>;
    exchangeCode: (code: string, deviceId: string) => Promise<Record<string, unknown>>;
    userInfo: (accessToken: string) => Promise<Record<string, unknown>>;
  };
};

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

const resolveVkProviders = () => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_VK_PROVIDER?.trim();
  const candidates = raw
    ? [raw.toLowerCase(), ...VK_PROVIDER_CANDIDATES]
    : [...VK_PROVIDER_CANDIDATES];

  const unique: string[] = [];
  for (const item of candidates) {
    if (!item || unique.includes(item)) {
      continue;
    }
    unique.push(item);
  }

  return unique;
};

const loadVkidSdk = async (): Promise<VkidSdk> => {
  if (typeof window === "undefined") {
    throw new Error("VK ID доступен только в браузере.");
  }

  const existing = (window as Window & { VKIDSDK?: VkidSdk }).VKIDSDK;
  if (existing) {
    return existing;
  }

  await new Promise<void>((resolve, reject) => {
    const prior = document.getElementById(VKID_SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (prior) {
      prior.addEventListener("load", () => resolve(), { once: true });
      prior.addEventListener("error", () => reject(new Error("Не удалось загрузить VK ID SDK.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = VKID_SDK_SCRIPT_ID;
    script.src = VKID_SDK_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить VK ID SDK."));
    document.head.appendChild(script);
  });

  const sdk = (window as Window & { VKIDSDK?: VkidSdk }).VKIDSDK;
  if (!sdk) {
    throw new Error("VK ID SDK не инициализировался.");
  }

  return sdk;
};

const extractVkCodePayload = (value: unknown): { code: string; deviceId: string } | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const code = typeof payload.code === "string" ? payload.code.trim() : "";
  const deviceId =
    typeof payload.device_id === "string"
      ? payload.device_id.trim()
      : typeof payload.deviceId === "string"
        ? payload.deviceId.trim()
        : "";

  if (!code || !deviceId) {
    return null;
  }

  return { code, deviceId };
};

const extractVkAccessToken = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const token =
    typeof payload.access_token === "string"
      ? payload.access_token.trim()
      : typeof payload.accessToken === "string"
        ? payload.accessToken.trim()
        : "";

  return token || null;
};

const extractVkUser = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const userRaw =
    payload.user && typeof payload.user === "object" ? (payload.user as Record<string, unknown>) : payload;

  const firstName =
    typeof userRaw.first_name === "string"
      ? userRaw.first_name
      : typeof userRaw.firstName === "string"
        ? userRaw.firstName
        : null;
  const lastName =
    typeof userRaw.last_name === "string"
      ? userRaw.last_name
      : typeof userRaw.lastName === "string"
        ? userRaw.lastName
        : null;
  const email =
    typeof userRaw.email === "string"
      ? userRaw.email
      : typeof userRaw.mail === "string"
        ? userRaw.mail
        : null;

  const displayName =
    typeof userRaw.full_name === "string"
      ? userRaw.full_name
      : typeof userRaw.name === "string"
        ? userRaw.name
        : [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  return {
    firstName,
    lastName,
    email,
    displayName,
  };
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

  if (normalized.includes("unsupported provider")) {
    return "Вход через VK ID пока не включен. Проверьте провайдер VK в Supabase Auth.";
  }

  if (normalized.includes("redirect url")) {
    return "Не настроен Redirect URL для VK ID. Добавьте адрес сайта в Supabase → Auth → URL Configuration.";
  }

  return message;
};

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const modeFromQuery = searchParams.get("mode");

  useEffect(() => {
    if (modeFromQuery !== "signin" && modeFromQuery !== "signup" && modeFromQuery !== "forgot") {
      return;
    }

    if (modeFromQuery !== mode) {
      setMode(modeFromQuery);
      setError("");
      setMessage("");

      if (modeFromQuery !== "signup") {
        setFullName("");
      }

      if (modeFromQuery === "forgot") {
        setPassword("");
      }
    }
  }, [modeFromQuery, mode]);

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

    router.replace(`/auth?mode=${nextMode}`, { scroll: false });
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
          router.replace("/auth?mode=signin", { scroll: false });
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

  const onVkLogin = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const appUrl = resolveAppUrl();
      const vkidAppIdRaw = process.env.NEXT_PUBLIC_VKID_APP_ID?.trim();
      const vkidAppId = vkidAppIdRaw ? Number(vkidAppIdRaw) : Number.NaN;
      const vkidScope = process.env.NEXT_PUBLIC_VKID_SCOPE?.trim() || "email";

      if (Number.isFinite(vkidAppId) && vkidAppId > 0) {
        const sdk = await loadVkidSdk();

        sdk.Config.init({
          app: vkidAppId,
          redirectUrl: appUrl ? `${appUrl}/auth` : window.location.origin,
          responseMode: sdk.ConfigResponseMode.Callback,
          source: sdk.ConfigSource.LOWCODE,
          scope: vkidScope,
        });

        trackClientEvent("auth_vk_started", {
          mode,
          provider: "vkid_sdk",
        });

        const loginPayload = await sdk.Auth.login();
        const codeData = extractVkCodePayload(loginPayload);
        if (!codeData) {
          throw new Error("VK ID не вернул код авторизации.");
        }

        const tokenPayload = await sdk.Auth.exchangeCode(codeData.code, codeData.deviceId);
        const accessToken = extractVkAccessToken(tokenPayload);
        if (!accessToken) {
          throw new Error("VK ID не вернул access token.");
        }

        const userPayload = await sdk.Auth.userInfo(accessToken);
        const user = extractVkUser(userPayload);

        const completeResponse = await fetch("/api/auth/vkid/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken,
            contactEmail: user?.email ?? null,
            firstName: user?.firstName ?? null,
            lastName: user?.lastName ?? null,
            displayName: user?.displayName ?? null,
          }),
        });

        const completeRaw = await completeResponse.text();
        const completePayload = completeRaw
          ? (JSON.parse(completeRaw) as { loginUrl?: string; error?: string })
          : {};

        if (!completeResponse.ok || !completePayload.loginUrl) {
          throw new Error(completePayload.error ?? "Не удалось завершить вход через VK ID.");
        }

        trackClientEvent("auth_vk_redirected", {
          mode,
          provider: "vkid_magiclink",
        });

        window.location.assign(completePayload.loginUrl);
        return;
      }

      const redirectTo = appUrl ? `${appUrl}/auth/callback?next=/dashboard` : undefined;
      const providers = resolveVkProviders();
      let lastError: Error | null = null;

      for (const provider of providers) {
        trackClientEvent("auth_vk_started", {
          mode,
          provider,
        });

        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: provider as never,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (!oauthError && data?.url) {
          trackClientEvent("auth_vk_redirected", {
            mode,
            provider,
          });

          window.location.assign(data.url);
          return;
        }

        lastError = oauthError ?? new Error("Не удалось запустить VK ID авторизацию.");
      }

      throw lastError ?? new Error("Не удалось запустить VK ID авторизацию.");
    } catch (oauthError) {
      setError(
        oauthError instanceof Error
          ? toReadableAuthError(oauthError.message, mode)
          : "Не удалось запустить VK ID авторизацию.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="surface auth-form-shell mx-auto w-full max-w-md p-5 md:p-7">
      <div className="mb-4">
        <h2 className="text-2xl font-bold leading-tight text-[var(--ink)]">
          {mode === "signup" ? "Регистрация в личный кабинет" : "Вход в аккаунт"}
        </h2>
        <p className="small-text mt-1">
          {mode === "signup"
            ? "Введите данные и начните обучение сразу после регистрации."
            : "Войдите, чтобы продолжить уроки и переписку по заданиям."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-cyan-50 p-1">
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
            placeholder="name@mail.ru"
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

      {mode !== "forgot" ? (
        <>
          <div className="my-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-[var(--line)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              или
            </span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <button
            type="button"
            onClick={onVkLogin}
            disabled={isLoading}
            className="action-button secondary-button w-full"
          >
            {isLoading ? "Подключаем VK ID..." : "Продолжить через VK ID"}
          </button>
        </>
      ) : null}

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

