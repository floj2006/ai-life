"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizePromoCode } from "@/lib/promo-codes";

type PromoCodeCreateFormProps = {
  className?: string;
};

const defaultState = {
  code: "",
  title: "",
  discountType: "percent",
  discountValue: "15",
  planScope: "all",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

export function PromoCodeCreateForm({ className = "" }: PromoCodeCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(defaultState);
  const [state, setState] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const discountHint = useMemo(() => {
    return form.discountType === "percent"
      ? "Скидка в процентах: от 1 до 100%."
      : "Фиксированная скидка в рублях.";
  }, [form.discountType]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("saving");
    setMessage("");

    try {
      const payload = {
        code: normalizePromoCode(form.code),
        title: form.title.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        planScope: form.planScope,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      };

      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      const result = raw ? (JSON.parse(raw) as { error?: string }) : {};

      if (!response.ok) {
        throw new Error(result.error ?? "Не удалось создать промокод.");
      }

      setState("success");
      setMessage("Промокод создан и готов к использованию.");
      setForm(defaultState);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Не удалось создать промокод.");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)] md:p-5 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Новый промокод</p>
          <p className="mt-0.5 text-xs text-slate-500">Код автоматически применяется на странице оплаты.</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
          ЮKassa
        </span>
      </div>

      <div className="space-y-4">
        <fieldset className="grid gap-3 lg:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Код</span>
            <input
              type="text"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="WELCOME50"
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm uppercase tracking-wide text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none"
              required
              maxLength={32}
            />
          </label>

          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Название (опционально)</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Запуск продукта"
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none"
              maxLength={120}
            />
          </label>
        </fieldset>

        <fieldset className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Тип скидки</span>
            <select
              value={form.discountType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountType: event.target.value as "percent" | "fixed_rub" }))
              }
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none"
            >
              <option value="percent">Проценты</option>
              <option value="fixed_rub">Рубли</option>
            </select>
          </label>

          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Значение</span>
            <input
              type="number"
              min={1}
              max={form.discountType === "percent" ? 100 : 100000}
              step={1}
              value={form.discountValue}
              onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none"
              required
            />
          </label>

          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Тариф</span>
            <select
              value={form.planScope}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, planScope: event.target.value as "all" | "start" | "max" }))
              }
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none"
            >
              <option value="all">Любой тариф</option>
              <option value="start">Только Старт</option>
              <option value="max">Только Макс</option>
            </select>
          </label>

          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Лимит использований</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.maxUses}
              onChange={(event) => setForm((prev) => ({ ...prev, maxUses: event.target.value }))}
              placeholder="Без лимита"
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none"
            />
          </label>
        </fieldset>

        <fieldset className="grid gap-3 lg:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Действует с (опционально)</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none"
            />
          </label>

          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600">Действует до (опционально)</span>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-sky-300 focus:outline-none"
            />
          </label>
        </fieldset>

        <label className="inline-flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>Активен сразу после создания</span>
        </label>

        <p className="text-xs text-slate-500">{discountHint}</p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={state === "saving"}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "saving" ? "Создаю..." : "Создать промокод"}
          </button>

          {message ? (
            <p
              className={`text-sm font-medium ${
                state === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
