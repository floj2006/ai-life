import Link from "next/link";
import {
  LEGAL_BRAND_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_TELEGRAM,
} from "@/lib/legal";

const legalLinks = [
  {
    href: "/privacy-policy",
    label: "Политика конфиденциальности",
  },
  {
    href: "/public-offer",
    label: "Публичная оферта",
  },
];

export function SiteFooter() {
  return (
    <footer className="container-shell mt-auto pt-2 pb-6 md:pb-8">
      <div className="surface relative z-10 mb-[calc(96px+env(safe-area-inset-bottom))] bg-white/88 px-5 py-4 backdrop-blur md:mb-0 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-semibold text-[var(--ink)]">{LEGAL_BRAND_NAME}</p>
            <p className="small-text">
              Контакты: {LEGAL_CONTACT_EMAIL} · {LEGAL_CONTACT_TELEGRAM}
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
            {legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
