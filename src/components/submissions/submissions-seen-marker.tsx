"use client";

import { useEffect } from "react";
import { nowIso, SUBMISSIONS_LAST_SEEN_AT_KEY } from "@/lib/submission-notifications";

export function SubmissionsSeenMarker() {
  useEffect(() => {
    const markSeen = () => {
      const value = nowIso();
      window.localStorage.setItem(SUBMISSIONS_LAST_SEEN_AT_KEY, value);
      window.dispatchEvent(new Event("submissions-seen"));
    };

    markSeen();
    const timerId = window.setInterval(markSeen, 20_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  return null;
}

