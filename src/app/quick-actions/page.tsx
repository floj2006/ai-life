import Link from "next/link";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { isAdminEmail } from "@/lib/admin-access";
import { requireUser } from "@/lib/auth";
import { quickActions } from "@/lib/content";

export default async function QuickActionsPage() {
  const { user } = await requireUser();
  const isAdmin = isAdminEmail(user.email);

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-5 py-4 md:py-8">
      <section className="surface fade-up p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Быстрые действия
        </h1>
        <p className="small-text mt-2 max-w-xl">
          Выбери действие, открой готовую инструкцию и получи результат за пару
          минут.
        </p>
      </section>

      <section className="grid gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.slug}
            href={`/quick-actions/${action.slug}`}
            className="surface fade-up flex flex-col gap-1 p-5 transition hover:-translate-y-[1px]"
          >
            <span className="text-xl font-bold">{action.title}</span>
            <span className="small-text">{action.subtitle}</span>
          </Link>
        ))}
      </section>

      <Link href="/dashboard" className="action-button secondary-button w-full sm:w-fit">
        Назад в кабинет
      </Link>

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}
