"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const safeDecodeUriComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const buildSafeVkidLoginUrl = (rawUrl: string, appUrl: string) => {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.pathname.startsWith("/auth/v1/verify")) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      if (supabaseUrl && /^https?:\/\//.test(supabaseUrl)) {
        const supa = new URL(supabaseUrl);
        parsed.protocol = supa.protocol;
        parsed.host = supa.host;
      }

      parsed.searchParams.set("redirect_to", `${appUrl}/auth`);
      return parsed.toString();
    }

    if (isLocalHostname(parsed.hostname) && parsed.hash.includes("access_token=")) {
      return `${appUrl}/auth${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
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
  const vkidAppIdRaw = process.env.NEXT_PUBLIC_VKID_APP_ID?.trim();
  const vkidAppId = vkidAppIdRaw ? Number(vkidAppIdRaw) : Number.NaN;
  const hasVkidSdkFlow = Number.isFinite(vkidAppId) && vkidAppId > 0;

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [isVkidPreparing, setIsVkidPreparing] = useState(hasVkidSdkFlow);
  const vkAutoCompleteRef = useRef(false);
  const submitLockRef = useRef(false);
  const vkClickLockRef = useRef(false);
  const vkidSdkRef = useRef<VkidSdk | null>(null);
  const modeFromQuery = searchParams.get("mode");
  const vkAuthCode = searchParams.get("code");
  const vkAuthDeviceId = searchParams.get("device_id") ?? searchParams.get("deviceId");
  const vkAuthError = searchParams.get("error");
  const vkAuthErrorDescription = searchParams.get("error_description");

  const completeVkidLogin = useCallback(
    async (code: string, deviceId: string, sdk?: VkidSdk) => {
      const activeSdk = sdk ?? (await loadVkidSdk());
      const tokenPayload = await activeSdk.Auth.exchangeCode(code, deviceId);
      const accessToken = extractVkAccessToken(tokenPayload);
      if (!accessToken) {
        throw new Error("VK ID не вернул access token.");
      }

      const userPayload = await activeSdk.Auth.userInfo(accessToken);
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
      let completePayload: { loginUrl?: string; error?: string } = {};
      if (completeRaw) {
        try {
          completePayload = JSON.parse(completeRaw) as { loginUrl?: string; error?: string };
        } catch {
          completePayload = {};
        }
      }

      if (!completeResponse.ok || !completePayload.loginUrl) {
        throw new Error(completePayload.error ?? "Не удалось завершить вход через VK ID.");
      }

      const appUrl = resolveAppUrl();
      const safeLoginUrl = buildSafeVkidLoginUrl(
        completePayload.loginUrl,
        appUrl || window.location.origin.replace(/\/+$/, ""),
      );

      window.location.assign(safeLoginUrl);
    },
    [],
  );

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
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      return;
    }

    setIsSessionChecking(true);
    setIsLoading(true);
    setError("");

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(toReadableAuthError(sessionError.message, mode));
          return;
        }

        try {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        } catch {
          // noop
        }

        router.replace("/dashboard");
        router.refresh();
      })
      .finally(() => {
        setIsSessionChecking(false);
        setIsLoading(false);
      });
  }, [mode, router, supabase]);

  useEffect(() => {
    if (mode === "forgot") {
      return;
    }

    if (!hasVkidSdkFlow) {
      setIsVkidPreparing(false);
      return;
    }

    let active = true;
    setIsVkidPreparing(true);

    loadVkidSdk()
      .then((sdk) => {
        if (active) {
          vkidSdkRef.current = sdk;
        }
      })
      .catch(() => {
        // SDK load errors are shown on login click; here we only warm it up.
      })
      .finally(() => {
        if (active) {
          setIsVkidPreparing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hasVkidSdkFlow, mode]);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      setIsSessionChecking(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) {
          return;
        }

        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
      } catch {
        if (!active) {
          return;
        }
      }

      setIsSessionChecking(false);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsSessionChecking(false);
        return;
      }

      setIsSessionChecking(true);
      router.replace("/dashboard");
      router.refresh();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    if (mode === "forgot") {
      return;
    }

    if (vkAuthError) {
      setError(
        toReadableAuthError(
          vkAuthErrorDescription
            ? `${vkAuthError}: ${safeDecodeUriComponent(vkAuthErrorDescription)}`
            : vkAuthError,
          mode,
        ),
      );
      return;
    }

    if (!vkAuthCode || !vkAuthDeviceId || vkAutoCompleteRef.current) {
      return;
    }

    vkAutoCompleteRef.current = true;
    setIsLoading(true);
    setError("");
    setMessage("");

    completeVkidLogin(vkAuthCode, vkAuthDeviceId)
      .catch((authError) => {
        setError(
          authError instanceof Error
            ? toReadableAuthError(authError.message, mode)
            : "Не удалось завершить вход через VK ID.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    completeVkidLogin,
    mode,
    vkAuthCode,
    vkAuthDeviceId,
    vkAuthError,
    vkAuthErrorDescription,
  ]);

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
  const showAuthLoadingOverlay = isSessionChecking || isLoading;
  const authLoadingText = isSessionChecking
    ? "Проверяем вход и загружаем данные аккаунта..."
    : "Выполняем вход...";

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
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
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
      submitLockRef.current = false;
      setIsLoading(false);
    }
  };

  const onVkLogin = async () => {
    if (vkClickLockRef.current || isLoading) {
      return;
    }

    vkClickLockRef.current = true;
    setIsLoading(true);
    setError("");
    setMessage("");
    let redirected = false;

    try {
      const appUrl = resolveAppUrl();
      const vkidScope = process.env.NEXT_PUBLIC_VKID_SCOPE?.trim() || "email";

      if (hasVkidSdkFlow) {
        const sdk = vkidSdkRef.current;
        if (!sdk) {
          setMessage("VK ID ещё подготавливается. Нажмите через 1-2 секунды.");
          return;
        }

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
          setMessage("Продолжите вход в окне VK ID. После возврата авторизация завершится автоматически.");
          return;
        }

        await completeVkidLogin(codeData.code, codeData.deviceId, sdk);
        redirected = true;
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
          redirected = true;
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
    } finally {
      if (!redirected) {
        vkClickLockRef.current = false;
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="surface auth-form-shell relative mx-auto w-full max-w-md p-5 md:p-7">
      {showAuthLoadingOverlay ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-white/92 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_20px_60px_rgba(8,47,73,0.16)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              <div>
                <p className="text-sm font-bold text-sky-900">Подождите немного</p>
                <p className="mt-0.5 text-sm text-slate-600">{authLoadingText}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
            disabled={isLoading || isVkidPreparing}
            className="action-button secondary-button w-full"
          >
            {isLoading
              ? "Подключаем VK ID..."
              : isVkidPreparing
                ? "Подготавливаем VK ID..."
                : "Продолжить через VK ID"}
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

