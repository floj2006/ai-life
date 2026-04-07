"use client";

import { useEffect } from "react";
import { trackClientEvent } from "@/lib/telemetry-client";

type TrackEventOnMountProps = {
  eventName: string;
  payload?: Record<string, unknown>;
};

export function TrackEventOnMount({
  eventName,
  payload = {},
}: TrackEventOnMountProps) {
  useEffect(() => {
    trackClientEvent(eventName, payload);
  }, [eventName, payload]);

  return null;
}
