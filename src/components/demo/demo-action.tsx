"use client";

import type { ReactNode } from "react";
import { useDemoMode } from "@/components/demo/demo-mode-provider";

type DemoActionProps = {
  actionLabel: string;
  className: string;
  children: ReactNode;
};

export function DemoAction({ actionLabel, className, children }: DemoActionProps) {
  const { interceptAction } = useDemoMode();

  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        interceptAction(actionLabel);
      }}
    >
      {children}
    </button>
  );
}

