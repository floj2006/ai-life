"use client";

import { useEffect, useMemo, useState } from "react";
import { trackClientEvent } from "@/lib/telemetry-client";
import { paidPlanById, type PaidPlanId } from "@/lib/pricing";

type YooKassaCheckoutButtonProps = {
  plan: PaidPlanId;
  label?: string;
  className?: string;
  allowPromoCode?: boolean;
};

type CheckoutApiResponse = {
  url?: string;
  error?: string;
  baseRub?: string;
  totalRub?: string;
  discountRub?: string;
  promoCode?: string | null;
};

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const toRubNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatRub = (value: number) => rubFormatter.format(Math.max(0, Math.round(value)));

export function YooKassaCheckoutButton({
  plan,
  label = "Оплатить через ЮKassa",
  className = "",
  allowPromoCode = true,
}: YooKassaCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewDiscountRub, setPreviewDiscountRub] = useState(0);
  const [previewTotalRub, setPreviewTotalRub] = useState(paidPlanById[plan].priceRub);
  const [appliedPromoCode, setAppliedPromoCode] = useState("");

  const basePriceRub = paidPlanById[plan].priceRub;
  const normalizedPromoCode = useMemo(() => promoCode.trim().toUpperCase(), [promoCode]);
  const finalPriceRub = Math.max(1, Math.round(previewTotalRub));
  const finalDiscountRub = Math.max(0, Math.round(previewDiscountRub));

  useEffect(() => {
    setPreviewDiscountRub(0);
    setPreviewTotalRub(basePriceRub);
    setPreviewError("");
    setAppliedPromoCode("");

    if (!allowPromoCode) {
      return;
    }

    if (!normalizedPromoCode) {
      return;
    }

    if (normalizedPromoCode.length < 3) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError("");
      setAppliedPromoCode("");

      try {
        const response = await fetch("/api/yookassa/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan,
            promoCode: normalizedPromoCode,
            preview: true,
          }),
        });

        const raw = await response.text();
        const payload = raw ? (JSON.parse(raw) as CheckoutApiResponse) : {};
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setPreviewError(payload.error ?? "Промокод не удалось применить.");
          setPreviewDiscountRub(0);
          setPreviewTotalRub(basePriceRub);
          return;
        }

        const totalRub = toRubNumber(payload.totalRub, basePriceRub);
        const discountRub = toRubNumber(payload.discountRub, 0);
        setPreviewTotalRub(totalRub);
        setPreviewDiscountRub(discountRub);
        setAppliedPromoCode(payload.promoCode ?? normalizedPromoCode);
      } catch {
        if (cancelled) {
          return;
        }

        setPreviewError("Не удалось проверить промокод. Попробуйте ещё раз.");
        setPreviewDiscountRub(0);
        setPreviewTotalRub(basePriceRub);
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allowPromoCode, basePriceRub, normalizedPromoCode, plan]);

  const handleCheckout = async () => {
    setError("");
    setIsLoading(true);
    let redirected = false;

    try {
      trackClientEvent("billing_checkout_started", {
        plan,
        provider: "yookassa",
        hasPromoCode: normalizedPromoCode.length > 0,
      });

      const response = await fetch("/api/yookassa/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          promoCode: normalizedPromoCode,
        }),
      });

      const raw = await response.text();
      const payload = raw ? (JSON.parse(raw) as CheckoutApiResponse) : {};

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Не удалось создать платеж.");
      }

      trackClientEvent("billing_checkout_redirected", {
        plan,
        provider: "yookassa",
        hasPromoCode: normalizedPromoCode.length > 0,
      });

      redirected = true;
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Не удалось запустить оплату.",
      );
    } finally {
      if (!redirected) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      {allowPromoCode ? (
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Промокод (если есть)</span>
          <input
            type="text"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value)}
            placeholder="WELCOME50"
            maxLength={32}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm uppercase tracking-wide text-slate-900 focus:border-sky-300 focus:outline-none"
            disabled={isLoading}
          />
        </label>
      ) : null}

      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Цена тарифа</span>
          <span>{formatRub(basePriceRub)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-slate-600">Скидка</span>
          <span className={finalDiscountRub > 0 ? "font-semibold text-emerald-700" : "text-slate-500"}>
            - {formatRub(finalDiscountRub)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-sky-100 pt-2">
          <span className="text-sm font-semibold text-slate-700">К оплате</span>
          <span className="text-lg font-bold text-slate-900">{formatRub(finalPriceRub)}</span>
        </div>

        {previewLoading ? (
          <p className="mt-2 text-xs font-medium text-sky-700">Проверяем промокод...</p>
        ) : null}
        {!previewLoading && previewError ? (
          <p className="mt-2 text-xs font-medium text-red-700">{previewError}</p>
        ) : null}
        {!previewLoading && !previewError && appliedPromoCode ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">
            Промокод {appliedPromoCode} применен.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading || previewLoading}
        className={`action-button primary-button w-full ${className}`}
      >
        {isLoading ? "Переходим к оплате..." : label}
      </button>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
