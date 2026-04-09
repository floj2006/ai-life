import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LESSONS_TOTAL, LESSONS_TOTAL_LABEL } from "@/lib/lesson-stats";
import { plans } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const trustChips = [LESSONS_TOTAL_LABEL, "Проверка", "Без опыта"];

const howItWorks = [
  {
    title: "Выбери урок",
    description: "Открой короткий урок с готовым шаблоном.",
  },
  {
    title: "Сделай результат",
    description: "Повтори шаги в Syntx AI и получи практический результат.",
  },
  {
    title: "Получи проверку",
    description: "Отправь задание и получи обратную связь от проверяющего.",
  },
] as const;

const testimonials = [
  {
    name: "Анна, бьюти-мастер",
    text: "За один вечер сделала аватар, оффер и ролик. Впервые AI стал для меня понятным.",
  },
  {
    name: "Илья, эксперт",
    text: "Пошаговый формат очень удобный: открыл урок, сделал задачу и сразу отправил на проверку.",
  },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

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

          <div className="flex items-center gap-2">
            <Link
              href="/auth?mode=signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[linear-gradient(120deg,var(--accent-strong),var(--accent))] px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(8,145,178,0.25)] transition hover:opacity-95"
            >
              Создать аккаунт
            </Link>
            <Link
              href="/auth?mode=signin"
              className="hidden h-9 items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-sky-300 hover:text-sky-800 sm:inline-flex"
            >
              Войти
            </Link>
          </div>
        </div>
      </header>

      <main className="container-shell flex flex-col gap-4 py-4 md:gap-8 md:py-8">
        <section className="surface fade-up p-4 md:p-10">
          <div className="grid items-center gap-6 md:grid-cols-[1.05fr_0.95fr] md:gap-10">
            <div>
              <h1 className="max-w-[12ch] text-[46px] font-bold leading-[1.03] md:text-[56px] md:leading-[64px]">
                Освой AI за 1 день
              </h1>
              <p className="small-text mt-3 max-w-[62ch] text-base md:text-lg">
                Фото, видео, тексты и бизнес-задачи с проверкой эксперта.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3">
                <Link href="/demo" className="action-button primary-button w-full">
                  Попробовать демо
                </Link>
                <Link href="#course-catalog" className="action-button secondary-button w-full">
                  Открыть курсы
                </Link>
              </div>

              <ul className="mt-4 grid grid-cols-3 gap-2">
                {trustChips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-xl border border-sky-200 bg-cyan-50 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-sky-800"
                  >
                    {chip}
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">Пройдено:</span> 0/{LESSONS_TOTAL}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-semibold text-[var(--ink)]">Новые ответы:</span> 0
              </div>
            </div>

            <article className="hidden rounded-3xl border border-[var(--line)] bg-white p-6 md:block">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                Как проходит обучение
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">Короткие уроки</p>
                  <p className="small-text mt-1">3-5 минут на один урок, без лишней теории.</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">Практика сразу</p>
                  <p className="small-text mt-1">Открываете шаблон в Syntx AI и делаете результат.</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">Проверка человеком</p>
                  <p className="small-text mt-1">Отправляете работу и получаете понятный фидбек.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          id="how-it-works"
          className="surface fade-up scroll-mt-24 p-4 md:scroll-mt-28 md:p-8"
          style={{ animationDelay: "0.03s", contentVisibility: "auto", containIntrinsicSize: "420px" }}
        >
          <h2 className="text-2xl font-bold md:text-[40px] md:leading-[48px]">Как это работает</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-6">
            {howItWorks.map((step) => (
              <article key={step.title} className="rounded-2xl border border-[var(--line)] bg-white p-4 md:p-6">
                <h3 className="text-lg font-bold md:text-2xl">{step.title}</h3>
                <p className="small-text mt-1 text-sm md:text-base">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="course-catalog"
          className="surface fade-up scroll-mt-24 p-4 md:scroll-mt-28 md:p-8"
          style={{ animationDelay: "0.06s", contentVisibility: "auto", containIntrinsicSize: "420px" }}
        >
          <h2 className="text-2xl font-bold md:text-[40px] md:leading-[48px]">Отзывы и доверие</h2>
          <p className="small-text mt-2 text-base">
            Ответ проверяющего обычно приходит в течение 24 часов.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 md:gap-6">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-2xl border border-[var(--line)] bg-white p-4 md:p-6">
                <p className="text-sm leading-7 text-[var(--ink)] md:text-base">{item.text}</p>
                <p className="mt-3 text-sm font-bold uppercase tracking-wide text-sky-700">{item.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="surface fade-up scroll-mt-24 p-4 md:scroll-mt-28 md:p-8"
          style={{ animationDelay: "0.09s", contentVisibility: "auto", containIntrinsicSize: "460px" }}
        >
          <h2 className="text-2xl font-bold md:text-[40px] md:leading-[48px]">Тарифы</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 md:gap-6">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-2xl border p-4 md:p-6 ${
                  plan.id === "max" ? "border-sky-300 bg-sky-50" : "border-[var(--line)] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold md:text-2xl">{plan.title}</h3>
                  <p className="text-xl font-bold md:text-2xl">{plan.priceLabel}</p>
                </div>
                <p className="small-text mt-1">{plan.subtitle}</p>
              </article>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/auth?mode=signup" className="action-button primary-button w-full sm:w-auto">
              Создать аккаунт
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

