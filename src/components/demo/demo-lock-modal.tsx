"use client";

import Link from "next/link";
import { useDemoMode } from "@/components/demo/demo-mode-provider";

const benefits = [
  "Сохраняйте и редактируйте результаты без ограничений",
  "Запускайте задания и получайте ответы в полном режиме",
  "Получайте статусы проверки и переписку в личном кабинете",
];

export function DemoLockModal() {
  const { isModalOpen, blockedAction, closeModal } = useDemoMode();

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[0_22px_44px_rgba(8,47,73,0.32)] md:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Демо-режим</p>
        <h2 className="mt-2 text-2xl font-bold">Зарегистрируйтесь или войдите, чтобы использовать эту функцию</h2>
        <p className="small-text mt-2">
          Вы нажали: <span className="font-semibold text-[var(--ink)]">{blockedAction ?? "действие"}</span>
        </p>

        <ul className="mt-4 grid gap-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link href="/auth?mode=signup" className="action-button primary-button w-full">
            Создать аккаунт
          </Link>
          <Link href="/auth?mode=signin" className="action-button secondary-button w-full">
            Войти
          </Link>
        </div>

        <button
          type="button"
          onClick={closeModal}
          className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
        >
          Закрыть демо-окно
        </button>
      </div>
    </div>
  );
}
