import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

type LegalNavigationItem = {
  id: string;
  title: string;
};

type LegalPageShellProps = {
  title: string;
  description: string;
  navigation: LegalNavigationItem[];
  children: ReactNode;
};

export function LegalPageShell({
  title,
  description,
  navigation,
  children,
}: LegalPageShellProps) {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface surface-glow overflow-hidden p-4 md:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700 md:text-xs">
                Юридическая информация
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight md:text-4xl">{title}</h1>
              <p className="small-text mt-3 max-w-2xl text-sm leading-relaxed md:text-base">
                {description}
              </p>
              <p className="small-text mt-2 text-sm">Редакция от {LEGAL_EFFECTIVE_DATE}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:w-auto">
              <Link
                href="/"
                className="action-button secondary-button min-h-[48px] w-full px-4 text-base md:min-h-[56px] md:w-auto md:px-5 md:text-lg"
              >
                На главную
              </Link>
              <Link
                href="/billing"
                className="action-button secondary-button min-h-[48px] w-full px-4 text-base md:min-h-[56px] md:w-auto md:px-5 md:text-lg"
              >
                К оплате
              </Link>
            </div>
          </div>

          <details className="rounded-[20px] bg-white/88 p-3 ring-1 ring-[var(--line)] md:hidden">
            <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--ink)]">
              Содержание документа
            </summary>
            <div className="mt-3 grid gap-2">
              {navigation.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-medium leading-snug text-[var(--ink)] ring-1 ring-[var(--line)] transition hover:border-sky-200 hover:text-sky-700"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </details>

          <nav
            aria-label="Навигация по документу"
            className="hidden overflow-x-auto pb-1 md:block [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex min-w-max gap-2">
              {navigation.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--line)] transition hover:border-sky-200 hover:text-sky-700"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <section className="grid gap-3 md:gap-4">{children}</section>
    </main>
  );
}
