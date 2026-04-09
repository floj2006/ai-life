"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUBMISSIONS_LAST_SEEN_AT_KEY } from "@/lib/submission-notifications";

type MobileBottomNavProps = {
  isAdmin: boolean;
};

type NavItem = {
  key:
    | "courses"
    | "submissions"
    | "billing"
    | "dashboard"
    | "review"
    | "admin"
    | "dialogs"
    | "settings";
  href: string;
  label: string;
  startsWith: string[];
  matchHash?: string;
  icon: ReactNode;
};

const iconClass = "h-5 w-5";

const userItems: NavItem[] = [
  {
    key: "courses",
    href: "/dashboard/courses",
    label: "Курсы",
    startsWith: ["/dashboard", "/dashboard/courses"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M4.5 6.5a2.5 2.5 0 0 1 2.5-2.5H20v14.5a.5.5 0 0 1-.5.5H7A2.5 2.5 0 0 0 4.5 21z" />
        <path d="M8.5 8.5h7" />
        <path d="M8.5 12h7" />
      </svg>
    ),
  },
  {
    key: "submissions",
    href: "/submissions",
    label: "Задания",
    startsWith: ["/submissions"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="4" y="3" width="16" height="18" rx="2.4" />
        <path d="M8.5 8.5h7" />
        <path d="M8.5 12h7" />
        <path d="m9 16 1.6 1.6L15.5 13" />
      </svg>
    ),
  },
  {
    key: "billing",
    href: "/billing",
    label: "Тариф",
    startsWith: ["/billing", "/success"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
        <path d="M2.5 10.5h19" />
        <path d="M8 15h2.5" />
      </svg>
    ),
  },
];

const adminItems: NavItem[] = [
  {
    key: "dashboard",
    href: "/admin#dashboard",
    label: "Панель",
    startsWith: ["/admin"],
    matchHash: "#dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="11" width="8" height="10" rx="2" />
        <rect x="3" y="14" width="8" height="7" rx="2" />
      </svg>
    ),
  },
  {
    key: "review",
    href: "/admin#review-queue",
    label: "Проверка",
    startsWith: ["/admin"],
    matchHash: "#review-queue",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    key: "admin",
    href: "/admin#users",
    label: "Пользователи",
    startsWith: ["/admin"],
    matchHash: "#users",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z" />
      </svg>
    ),
  },
  {
    key: "dialogs",
    href: "/admin#pricing",
    label: "Тарифы",
    startsWith: ["/admin"],
    matchHash: "#pricing",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
        <path d="M2.5 10.5h19" />
        <path d="M8 15h2.5" />
      </svg>
    ),
  },
  {
    key: "settings",
    href: "/admin#settings",
    label: "Настройки",
    startsWith: ["/admin"],
    matchHash: "#settings",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z" />
      </svg>
    ),
  },
];

const isActiveItem = (pathname: string, hash: string, item: NavItem) => {
  if (item.matchHash && pathname === "/admin") {
    if (!hash || hash === "#") {
      return item.matchHash === "#dashboard";
    }
    return item.matchHash === hash;
  }

  if (pathname === item.href) {
    return true;
  }

  return item.startsWith.some((prefix) => pathname.startsWith(prefix));
};

const getSeenAtIso = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SUBMISSIONS_LAST_SEEN_AT_KEY);
};

export function MobileBottomNav({ isAdmin }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = isAdmin ? adminItems : userItems;
  const [hasSubmissionUpdates, setHasSubmissionUpdates] = useState(false);
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const syncHash = () => {
      setCurrentHash(window.location.hash || "#dashboard");
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    let stopped = false;

    const refreshNotifications = async () => {
      try {
        const seenAt = getSeenAtIso();
        const query = seenAt ? `?since=${encodeURIComponent(seenAt)}` : "";
        const response = await fetch(`/api/submissions/notifications${query}`, {
          cache: "no-store",
        });

        if (!response.ok || stopped) {
          return;
        }

        const payload = (await response.json()) as { hasUpdates?: boolean };
        setHasSubmissionUpdates(Boolean(payload.hasUpdates));
      } catch {
        if (!stopped) {
          setHasSubmissionUpdates(false);
        }
      }
    };

    void refreshNotifications();

    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    }, 30_000);

    const onStorage = (event: StorageEvent) => {
      if (event.key === SUBMISSIONS_LAST_SEEN_AT_KEY) {
        void refreshNotifications();
      }
    };

    const onSeen = () => {
      void refreshNotifications();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("submissions-seen", onSeen);
    window.addEventListener("focus", onSeen);

    return () => {
      stopped = true;
      clearInterval(pollId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("submissions-seen", onSeen);
      window.removeEventListener("focus", onSeen);
    };
  }, [isAdmin]);

  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 md:hidden" aria-label="Мобильная навигация">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-[var(--line)] bg-white/96 px-2 py-2 shadow-[0_16px_38px_rgba(8,47,73,0.2)] backdrop-blur">
        <ul className={`grid gap-1 ${isAdmin ? "grid-cols-5" : "grid-cols-3"}`}>
          {items.map((item) => {
            const active = isActiveItem(pathname, currentHash, item);
            const showSubmissionDot =
              !isAdmin && item.key === "submissions" && hasSubmissionUpdates;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                    active
                      ? "bg-sky-600 text-white"
                      : "text-[var(--ink-soft)] hover:bg-sky-50 hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${
                      active ? "bg-white/20" : "bg-sky-50 text-sky-700"
                    }`}
                  >
                    {item.icon}
                    {showSubmissionDot ? (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                    ) : null}
                  </span>
                  <span className="mt-1 leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
