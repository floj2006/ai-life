import type { LessonCategory } from "@/lib/types";

type LessonCategoryChipProps = {
  category: LessonCategory;
};

const CATEGORY_LABELS: Record<LessonCategory, string> = {
  photo: "Фото",
  video: "Видео",
  text: "Текст",
  business: "Бизнес",
};

export function LessonCategoryChip({ category }: LessonCategoryChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase text-sky-800">
      <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden>
        {category === "photo" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        ) : null}
        {category === "video" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="14" height="12" rx="2" />
            <path d="m17 10 4-3v10l-4-3z" />
          </svg>
        ) : null}
        {category === "text" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
        ) : null}
        {category === "business" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8h18v11H3z" />
            <path d="M8 8V6h8v2" />
            <path d="M3 13h18" />
          </svg>
        ) : null}
      </span>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

