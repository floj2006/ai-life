import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { plans } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

const skills = ["улучшать фото", "создавать видео", "писать тексты"];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }
  return (
    <main className="container-shell flex flex-col gap-6 py-4 md:py-8">
      <section className="surface fade-up overflow-hidden">
        <div className="grid gap-4 p-5 md:grid-cols-2 md:gap-8 md:p-10">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="brand-badge fade-up" style={{ animationDelay: "0.03s" }}>
              <Image
                src="/brand/ai-easy-life-avatar.png"
                alt="Логотип AI Easy Life"
                width={42}
                height={42}
                className="rounded-xl border border-sky-200 bg-white p-1"
                priority
              />
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
                AI Easy Life
              </p>
            </div>

            <h1 className="text-3xl font-bold leading-tight md:text-5xl">
              Освой AI за 1 день и упрости свою жизнь
            </h1>
            <p className="small-text max-w-md">
              Понятные уроки без технического языка. Уже в первый день вы получите
              практический результат в фото, видео и текстах.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth" className="action-button primary-button w-full pulse-glow sm:w-auto">
                Начать
              </Link>
            </div>
          </div>

          <div className="surface grid grid-cols-2 gap-3 p-3">
            <div className="space-y-2 fade-up" style={{ animationDelay: "0.05s" }}>
              <p className="text-xs font-semibold uppercase text-zinc-500">Фото: до</p>
              <Image
                src="/before-photo.svg"
                alt="Фото до обработки"
                width={500}
                height={320}
                className="h-auto w-full rounded-xl border border-zinc-200"
                priority
              />
            </div>
            <div className="space-y-2 fade-up" style={{ animationDelay: "0.1s" }}>
              <p className="text-xs font-semibold uppercase text-zinc-500">Фото: после</p>
              <Image
                src="/after-photo.svg"
                alt="Фото после AI-обработки"
                width={500}
                height={320}
                className="h-auto w-full rounded-xl border border-zinc-200"
                priority
              />
            </div>
            <div
              className="col-span-2 grid gap-3 fade-up sm:grid-cols-2"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold uppercase text-zinc-500">Текст: до</p>
                <p className="mt-2 text-sm text-zinc-700">
                  Длинный черновик без структуры, сложные формулировки и нет призыва к действию.
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="text-xs font-semibold uppercase text-sky-700">Текст: после</p>
                <p className="mt-2 text-sm text-sky-900">
                  Короткий понятный текст с выгодой, примером и четким CTA для читателя.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface fade-up p-5 md:p-8" style={{ animationDelay: "0.08s" }}>
        <h2 className="mb-4 text-2xl font-bold md:text-3xl">Что ты научишься делать</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {skills.map((item, index) => (
            <li
              key={item}
              className="rounded-2xl border border-[var(--line)] bg-cyan-50 p-4 text-lg font-semibold fade-up"
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface fade-up p-5 md:p-8" style={{ animationDelay: "0.12s" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold md:text-3xl">Тарифы</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border p-5 transition hover:-translate-y-1 ${
                plan.id === "max"
                  ? "border-sky-300 bg-sky-50"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold">{plan.title}</h3>
                  <p className="small-text">{plan.subtitle}</p>
                </div>
                <p className="text-xl font-bold">{plan.priceLabel}</p>
              </div>
              <ul className="mt-3 grid gap-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="small-text">
                    • {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}


