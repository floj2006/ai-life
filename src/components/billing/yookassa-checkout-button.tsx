"use client";

import { useState } from "react";
import { trackClientEvent } from "@/lib/telemetry-client";
import type { PaidPlanId } from "@/lib/pricing";

type YooKassaCheckoutButtonProps = {
  plan: PaidPlanId;
  label?: string;
  className?: string;
  allowPromoCode?: boolean;
};

export function YooKassaCheckoutButton({
  plan,
  label = "Оплатить через ЮKassa",
  className = "",
  allowPromoCode = true,
}: YooKassaCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");

  const handleCheckout = async () => {
    setError("");
    setIsLoading(true);

    try {
      const normalizedPromoCode = promoCode.trim().toUpperCase();

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
      const payload = raw ? (JSON.parse(raw) as { url?: string; error?: string }) : {};

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Не удалось создать платеж.");
      }

      trackClientEvent("billing_checkout_redirected", {
        plan,
        provider: "yookassa",
        hasPromoCode: normalizedPromoCode.length > 0,
      });

      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Не удалось запустить оплату.",
      );
      setIsLoading(false);
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

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
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
