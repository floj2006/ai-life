import Link from "next/link";

const envChecks = [
  ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
  ["SUPABASE_URL", Boolean(process.env.SUPABASE_URL)],
  [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
  ],
  [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  ],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
  ["SUPABASE_PUBLISHABLE_KEY", Boolean(process.env.SUPABASE_PUBLISHABLE_KEY)],
  ["SUPABASE_ANON_KEY", Boolean(process.env.SUPABASE_ANON_KEY)],
  ["SUPABASE_SERVICE_ROLE_KEY", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
  ["APP_ADMIN_EMAILS", Boolean(process.env.APP_ADMIN_EMAILS)],
] as const;

export default function SetupPage() {
  return (
    <main className="container-shell flex flex-col gap-4 py-4 md:py-8">
      <section className="surface p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Нужна настройка Supabase
        </h1>
        <p className="small-text mt-2">
          Этот деплой пока не видит нужные ключи Supabase, поэтому личные страницы закрыты.
        </p>
      </section>

      <section className="surface p-5 md:p-8">
        <h2 className="text-2xl font-bold">Как подключить вашу текущую базу</h2>
        <ol className="mt-3 grid gap-3 text-sm text-slate-700">
          <li className="rounded-2xl border border-sky-100 bg-white/70 p-4">
            1. Не создавайте новую базу через интеграции хостинга, если проект Supabase у вас уже есть.
          </li>
          <li className="rounded-2xl border border-sky-100 bg-white/70 p-4">
            2. Откройте настройки окружения в вашем хостинге: Vercel или Render.
          </li>
          <li className="rounded-2xl border border-sky-100 bg-white/70 p-4">
            3. Добавьте ключи вручную из вашей существующей Supabase-базы.
          </li>
          <li className="rounded-2xl border border-sky-100 bg-white/70 p-4">
            4. Если вы используете preview-окружение, переменные должны быть добавлены именно туда.
          </li>
          <li className="rounded-2xl border border-sky-100 bg-white/70 p-4">
            5. После добавления переменных обязательно сделайте Redeploy: старые деплои их не подхватывают.
          </li>
        </ol>
      </section>

      <section className="surface p-5 md:p-8">
        <h2 className="text-2xl font-bold">Обязательные ключи</h2>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-cyan-50 p-4 text-sm leading-relaxed">{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ваш_публичный_ключ
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_ключ
APP_ADMIN_EMAILS=ваш@email.ru
NEXT_PUBLIC_APP_URL=https://ваш-домен.onrender.com`}</pre>
        <p className="small-text mt-3">
          Проект также поддерживает алиасы: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`,
          `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`.
        </p>
        <p className="small-text mt-2">
          Публичный ключ не должен начинаться с `sb_secret_`.
        </p>
      </section>

      <section className="surface p-5 md:p-8">
        <h2 className="text-2xl font-bold">Что видит этот деплой</h2>
        <p className="small-text mt-2">
          Ниже показано только наличие переменных, без вывода их значений.
        </p>
        <div className="mt-4 grid gap-2">
          {envChecks.map(([label, present]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/70 px-4 py-3 text-sm"
            >
              <span className="font-semibold text-slate-700">{label}</span>
              <span
                className={
                  present
                    ? "rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700"
                    : "rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700"
                }
              >
                {present ? "Есть" : "Нет"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="action-button secondary-button w-full sm:w-fit">
          На главную
        </Link>
      </div>
    </main>
  );
}
