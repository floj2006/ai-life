import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="container-shell flex flex-col gap-4 py-4 md:py-8">
      <section className="surface p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Нужна настройка Supabase
        </h1>
        <p className="small-text mt-2">
          Добавьте ключи Supabase в `.env.local`, чтобы открыть личные страницы.
        </p>
      </section>

      <section className="surface p-5 md:p-8">
        <h2 className="text-2xl font-bold">Обязательные ключи</h2>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-cyan-50 p-4 text-sm leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=... # или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=...`}
        </pre>
        <p className="small-text mt-3">
          Где взять: Supabase Dashboard, затем раздел Settings и API.
        </p>
        <p className="small-text mt-2">
          `NEXT_PUBLIC_SUPABASE_URL` должен быть в формате
          `https://your-project-ref.supabase.co`.
        </p>
        <p className="small-text mt-2">
          Публичный ключ можно передать как
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`,
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` или `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
          Он не должен начинаться с `sb_secret_`.
        </p>
        <p className="small-text mt-2">
          После изменения `.env.local` перезапустите `npm run dev`.
        </p>
        <p className="small-text mt-2">
          Для проверки домашних заданий добавьте `APP_ADMIN_EMAILS=ваш@email.ru`.
        </p>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="action-button secondary-button w-full sm:w-fit">
          На главную
        </Link>
      </div>
    </main>
  );
}

