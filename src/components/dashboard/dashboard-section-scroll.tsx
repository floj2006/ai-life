"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function DashboardSectionScroll() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const section = searchParams.get("section");
    if (section !== "courses") {
      return;
    }

    const tryScroll = () => {
      const element = document.getElementById("course-catalog");
      if (!element) {
        return false;
      }
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    };

    if (tryScroll()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      tryScroll();
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchParams]);

  return null;
}

