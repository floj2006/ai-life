"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomNavProps = {
  isAdmin: boolean;
};

type NavItem = {
  href: string;
  label: string;
  startsWith: string[];
  icon: ReactNode;
};

const iconClass = "h-5 w-5";

const userItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Курсы",
    startsWith: ["/dashboard"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v15.5a.5.5 0 0 1-.5.5H6.5A2.5 2.5 0 0 0 4 22" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/submissions",
    label: "Задания",
    startsWith: ["/submissions", "/review"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="m9 16 1.5 1.5L15 13" />
      </svg>
    ),
  },
  {
    href: "/billing",
    label: "Тариф",
    startsWith: ["/billing", "/success"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M8 15h2" />
      </svg>
    ),
  },
];

const adminItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Кабинет",
    startsWith: ["/dashboard"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="11" width="8" height="10" rx="2" />
        <rect x="3" y="14" width="8" height="7" rx="2" />
      </svg>
    ),
  },
  {
    href: "/review",
    label: "Проверка",
    startsWith: ["/review"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Тарифы",
    startsWith: ["/admin"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z" />
      </svg>
    ),
  },
  {
    href: "/submissions",
    label: "Диалоги",
    startsWith: ["/submissions"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const isActiveItem = (pathname: string, item: NavItem) => {
  if (pathname === item.href) {
    return true;
  }

  return item.startsWith.some((prefix) => pathname.startsWith(prefix));
};

export function MobileBottomNav({ isAdmin }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = isAdmin ? adminItems : userItems;

  return (
    <nav
      className="fixed inset-x-2 bottom-2 z-40 md:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-[var(--line)] bg-white/95 px-2 py-2 shadow-[0_14px_36px_rgba(8,47,73,0.18)] backdrop-blur">
        <ul className={`grid gap-1 ${isAdmin ? "grid-cols-5" : "grid-cols-3"}`}>
          {items.map((item) => {
            const active = isActiveItem(pathname, item);

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
                  {item.icon}
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
