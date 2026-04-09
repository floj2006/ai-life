"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  matches?: string[];
};

const iconClass = "h-4 w-4";

const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Панель",
    matches: ["/admin"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="8" height="8" rx="1.8" />
        <rect x="13" y="3" width="8" height="5" rx="1.8" />
        <rect x="13" y="11" width="8" height="10" rx="1.8" />
        <rect x="3" y="14" width="8" height="7" rx="1.8" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 19c0-3 2.8-5 6-5s6 2 6 5" />
        <path d="M14 19c.2-1.5 1.6-2.8 3.5-2.8 2 0 3.5 1.3 3.5 2.8" />
      </svg>
    ),
  },
  {
    href: "/admin/tasks",
    label: "Задания",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="4" y="3" width="16" height="18" rx="2.2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: "/admin/review",
    label: "Очередь проверки",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="m5 12 4 4 10-10" />
        <path d="M4 4h16v16H4z" />
      </svg>
    ),
  },
  {
    href: "/admin/pricing",
    label: "Тарифы",
    matches: ["/admin/pricing", "/admin/promo-codes"],
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
        <path d="M2.5 10.5h19" />
      </svg>
    ),
  },
  {
    href: "/admin/messages",
    label: "Сообщения",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/promo-codes",
    label: "Промокоды",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 8a2 2 0 0 1 2-2h12v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M9 6v4" />
        <path d="M13 6v4" />
        <path d="M8 14h8" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Настройки",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" />
      </svg>
    ),
  },
];

const isActive = (pathname: string, item: AdminNavItem) => {
  const matchList = item.matches ?? [item.href];

  return matchList.some(
    (value) => pathname === value || pathname.startsWith(`${value}/`),
  );
};

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Навигация админ-панели">
      <ul className="grid gap-1">
        {adminNavItems.map((item) => {
          const active = isActive(pathname, item);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
