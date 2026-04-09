"use client";

import Image from "next/image";
import Link from "next/link";
import { DemoAction } from "@/components/demo/demo-action";
import { DemoLockModal } from "@/components/demo/demo-lock-modal";
import { DemoModeProvider, useDemoMode } from "@/components/demo/demo-mode-provider";
import type { DemoDashboardData } from "@/lib/demo-data";

const categoryLabel: Record<DemoDashboardData["results"][number]["category"], string> = {
  photo: "Фото",
  video: "Видео",
  text: "Тексты",
  business: "Бизнес",
  photosession: "Нейрофотосессия",
};

const sessionToClock = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

function DemoDashboardView({ data }: { data: DemoDashboardData }) {
  const { toastMessage, clearToast, sessionSecondsLeft } = useDemoMode();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/96 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-[1120px] items-center justify-between px-3 md:h-14 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/ai-easy-life-avatar.png"
              alt="AI Easy Life"
              width={34}
              height={34}
              className="rounded-xl border border-sky-200 bg-white p-0.5"
              priority
            />
            <span className="text-sm font-bold uppercase tracking-widest text-sky-800">
              AI Easy Life
            </span>
          </Link>
          <Link
            href="/auth?mode=signin"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-sky-300 hover:text-sky-800"
          >
            Войти
          </Link>
        </div>
      </header>

      <main className="container-shell flex flex-col gap-4 py-4 md:gap-6 md:py-8">
        <section className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-amber-900">
              Вы в демо-режиме
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-amber-700">
                {sessionToClock(sessionSecondsLeft)}
              </span>
              <Link href="/auth?mode=signup" className="action-button primary-button h-10 min-h-10 px-4 text-sm">
                Создать аккаунт
              </Link>
            </div>
          </div>
        </section>

        <section className="surface fade-up p-5 md:p-8">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
                Демо-кабинет
              </p>
              <h1 className="mt-1 text-3xl font-bold md:text-5xl">
                Привет, {data.user.fullName}!
              </h1>
              <p className="small-text mt-2 max-w-[58ch]">
                Это демонстрационный личный кабинет с реалистичными данными.
                Все кнопки выглядят как в рабочем продукте, но изменения здесь не сохраняются.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Уровень</p>
                <p className="mt-1 text-2xl font-bold">{data.user.tier}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Прогресс</p>
                <p className="mt-1 text-2xl font-bold">
                  {data.user.lessonsCompleted}/{data.user.lessonsTotal}
                </p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Новые ответы</p>
                <p className="mt-1 text-2xl font-bold">{data.user.pendingFeedback}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface fade-up p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                Рабочая зона
              </p>
              <h2 className="mt-1 text-2xl font-bold">Нейро-результаты (демо)</h2>
              <p className="small-text mt-1">
                Такой же формат, как в реальном разделе курсов: результат, статус и действие в один экран.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DemoAction actionLabel="Открыть демо-каталог" className="action-button secondary-button w-full">
                Каталог уроков
              </DemoAction>
              <DemoAction actionLabel="Открыть демо-задания" className="action-button primary-button w-full">
                Мои задания
              </DemoAction>
            </div>
          </div>
        </section>

        <section className="surface fade-up p-5 md:p-6">
          <h2 className="text-2xl font-bold">Нейро-результаты (демо)</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {data.results.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700">
                    {categoryLabel[item.category]}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{item.updatedAt}</span>
                </div>
                <p className="mt-3 font-semibold">{item.title}</p>
                <p className="small-text mt-2 min-h-[66px] text-sm">{item.preview}</p>
                <p className="mt-2 text-sm font-semibold text-sky-800">
                  Оценка качества: {item.qualityScore}%
                </p>

                <div className="mt-3 grid gap-2">
                  <DemoAction actionLabel="Улучшить результат" className="action-button secondary-button w-full">
                    Улучшить
                  </DemoAction>
                  <DemoAction actionLabel="Сохранить результат" className="action-button primary-button w-full">
                    Сохранить
                  </DemoAction>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <DemoLockModal />

      {toastMessage ? (
        <button
          type="button"
          onClick={clearToast}
          className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-1/2 z-[65] w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-left text-sm font-semibold text-sky-900 shadow-[0_16px_30px_rgba(8,47,73,0.22)]"
        >
          {toastMessage}
        </button>
      ) : null}
    </>
  );
}

export function DemoDashboardShell({ data }: { data: DemoDashboardData }) {
  return (
    <DemoModeProvider>
      <DemoDashboardView data={data} />
    </DemoModeProvider>
  );
}
