"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type PaidPlanId } from "@/lib/pricing";
import { trackClientEvent } from "@/lib/telemetry-client";

type StartProButtonProps = {
  plan?: PaidPlanId;
  buttonLabel?: string;
};

export function StartProButton({
  plan = "max",
  buttonLabel = "Открыть реквизиты Max",
}: StartProButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isLoading}
        className="action-button primary-button pulse-glow w-full"
        onClick={() => {
          setIsLoading(true);
          trackClientEvent("upgrade_cta_clicked", {
            plan,
            source: "dashboard",
          });
          router.push(`/billing?plan=${plan}`);
          setIsLoading(false);
        }}
      >
        {isLoading ? "Открываю..." : buttonLabel}
      </button>
    </div>
  );
}
