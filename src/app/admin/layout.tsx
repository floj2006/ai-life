import type { ReactNode } from "react";
import Link from "next/link";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { requireAdminUser } from "@/lib/admin-access";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdminUser();

  return (
    <main className="with-mobile-nav min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-[1360px] px-3 py-4 md:px-6 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
            <div className="mb-4 border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI Easy Life</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Админ-панель</h1>
            </div>

            <AdminSidebarNav />

            <div className="mt-5 border-t border-slate-200 pt-4">
              <LogoutButton tone="danger" className="w-full justify-center" />
            </div>
          </aside>

          <section className="min-w-0">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Роль</p>
                <p className="mt-1 text-base font-semibold text-slate-900">Администратор</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Личный кабинет
                </Link>
                <Link
                  href="/admin/review"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  К проверке
                </Link>
              </div>
            </header>

            {children}
          </section>
        </div>
      </div>

      <MobileBottomNav isAdmin />
    </main>
  );
}

