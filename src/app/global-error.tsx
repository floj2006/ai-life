"use client";

import { useEffect } from "react";
import { trackClientError } from "@/lib/telemetry-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackClientError({
      source: "render",
      message: error.message || "Global render error",
      stack: error.stack ?? null,
      metadata: {
        digest: error.digest ?? null,
      },
    });
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <main className="container-shell flex min-h-screen items-center justify-center py-8">
          <section className="surface surface-glow max-w-xl p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
              Что-то пошло не так
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">
              Страница временно недоступна
            </h1>
            <p className="small-text mt-3">
              Мы уже сохранили информацию об ошибке. Попробуйте обновить страницу или вернуться чуть позже.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="action-button primary-button mt-5 w-full sm:w-auto"
            >
              Попробовать снова
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
