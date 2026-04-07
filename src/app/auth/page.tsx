import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const highlights = [
  "Пошаговый формат без технических терминов",
  "Уроки до 5 минут с готовыми промптами",
  "Прогресс и личный кабинет в одном окне",
];

export default async function AuthPage() {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="container-shell flex flex-1 flex-col justify-center gap-6 py-5">
      <section className="grid gap-4 md:grid-cols-[1.05fr_1fr] md:gap-6">
        <article className="surface fade-up relative overflow-hidden p-6 md:p-8">
          <div className="auth-orb auth-orb-left" />
          <div className="auth-orb auth-orb-right" />

          <div className="brand-badge mb-3">
            <Image
              src="/brand/ai-easy-life-avatar.png"
              alt="Логотип AI Easy Life"
              width={40}
              height={40}
              className="rounded-xl border border-sky-200 bg-white p-1"
              priority
            />
            <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
              AI Easy Life
            </p>
          </div>

          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Вход в личный кабинет
          </h1>
          <p className="small-text mt-2 max-w-xl">
            Один аккаунт для уроков, быстрых действий и отслеживания прогресса.
          </p>

          <ul className="mt-5 grid gap-3">
            {highlights.map((item, index) => (
              <li
                key={item}
                className="fade-up rounded-2xl border border-sky-100 bg-white/70 p-3 text-sm font-semibold text-sky-900"
                style={{ animationDelay: `${0.08 + index * 0.05}s` }}
              >
                {item}
              </li>
            ))}
          </ul>
        </article>

        <div className="fade-up" style={{ animationDelay: "0.08s" }}>
          <AuthForm />
        </div>
      </section>

      <Link href="/" className="mx-auto text-sm font-semibold text-sky-700 transition hover:opacity-80">
        На главную
      </Link>
    </main>
  );
}

