"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { trackClientEvent } from "@/lib/telemetry-client";

const DEMO_SESSION_SECONDS = 15 * 60;

type DemoModeContextValue = {
  isDemoMode: true;
  blockedAction: string | null;
  isModalOpen: boolean;
  toastMessage: string | null;
  sessionSecondsLeft: number;
  interceptAction: (actionLabel: string) => void;
  closeModal: () => void;
  clearToast: () => void;
};

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [blockedAction, setBlockedAction] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(DEMO_SESSION_SECONDS);
  const hasSentLimitEventRef = useRef(false);

  const interceptAction = useCallback((actionLabel: string) => {
    setBlockedAction(actionLabel);
    setIsModalOpen(true);
    setToastMessage("Зарегистрируйтесь или войдите, чтобы использовать эту функцию");

    trackClientEvent("demo_action_blocked", {
      actionLabel,
    });
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  useEffect(() => {
    trackClientEvent("demo_mode_opened");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (toastMessage) {
        setToastMessage(null);
      }
    }, 2400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toastMessage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (sessionSecondsLeft === 0 && !hasSentLimitEventRef.current) {
      hasSentLimitEventRef.current = true;
      trackClientEvent("demo_session_limit_reached");
    }
  }, [sessionSecondsLeft]);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode: true,
      blockedAction,
      isModalOpen,
      toastMessage,
      sessionSecondsLeft,
      interceptAction,
      closeModal,
      clearToast,
    }),
    [
      blockedAction,
      isModalOpen,
      toastMessage,
      sessionSecondsLeft,
      interceptAction,
      closeModal,
      clearToast,
    ],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error("useDemoMode можно использовать только внутри DemoModeProvider.");
  }
  return context;
};
