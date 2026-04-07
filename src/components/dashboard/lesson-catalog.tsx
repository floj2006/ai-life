"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LessonCategoryChip } from "@/components/dashboard/lesson-category-chip";
import { getTierLabel } from "@/lib/subscription";
import type { LessonCategory, LessonWithProgress, SubscriptionTier } from "@/lib/types";

type LessonCatalogProps = {
  lessons: LessonWithProgress[];
  currentTier: SubscriptionTier;
};

const FILTERS: { value: LessonCategory | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "photo", label: "Фото" },
  { value: "video", label: "Видео" },
  { value: "text", label: "Тексты" },
  { value: "business", label: "Бизнес" },
];

const TIER_SECTIONS: SubscriptionTier[] = ["newbie", "start", "max"];
const LEVEL_FILTERS: { value: SubscriptionTier | "all"; label: string }[] = [
  { value: "all", label: "Все уровни" },
  { value: "newbie", label: "Newbie" },
  { value: "start", label: "Start" },
  { value: "max", label: "Max" },
];

const tierSectionTitle = (tier: SubscriptionTier) => {
  if (tier === "newbie") {
    return "Уроки уровня Newbie";
  }

  if (tier === "start") {
    return "Уроки уровня Start";
  }

  return "Уроки уровня Max";
};

const tierBadgeClass = (tier: SubscriptionTier) => {
  if (tier === "max") {
    return "bg-amber-100 text-amber-800";
  }

  if (tier === "start") {
    return "bg-slate-100 text-slate-800";
  }

  return "bg-cyan-100 text-cyan-800";
};

export function LessonCatalog({ lessons, currentTier }: LessonCatalogProps) {
  const [filter, setFilter] = useState<LessonCategory | "all">("all");
  const [levelFilter, setLevelFilter] = useState<SubscriptionTier | "all">("all");

  const sections = useMemo(() => {
    const sortedLessons = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
    const tiers = levelFilter === "all" ? TIER_SECTIONS : [levelFilter];
    const tierBuckets = new Map<SubscriptionTier, LessonWithProgress[]>(
      tiers.map((tier) => [tier, []]),
    );

    for (const lesson of sortedLessons) {
      if (filter !== "all" && lesson.category !== filter) {
        continue;
      }

      if (!tierBuckets.has(lesson.required_tier)) {
        continue;
      }

      tierBuckets.get(lesson.required_tier)?.push(lesson);
    }

    return tiers
      .map((tier) => ({
        tier,
        title: tierSectionTitle(tier),
        items: tierBuckets.get(tier) ?? [],
      }))
      .filter((section) => section.items.length > 0);
  }, [filter, lessons, levelFilter]);

  return (
    <section id="course-catalog" className="fade-up mx-auto w-full">
      <div className="mb-4 flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">Курсы</h2>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {LEVEL_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setLevelFilter(item.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                levelFilter === item.value
                  ? "bg-sky-600 text-white"
                  : "bg-zinc-100 text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {FILTERS.map((filterItem) => (
            <button
              key={filterItem.value}
              type="button"
              onClick={() => setFilter(filterItem.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === filterItem.value
                  ? "bg-sky-600 text-white"
                  : "bg-cyan-50 text-[var(--ink)]"
              }`}
            >
              {filterItem.label}
            </button>
          ))}
        </div>
      </div>

      <p className="small-text mb-4 text-center">
        Ваш уровень доступа: <span className="font-semibold">{getTierLabel(currentTier)}</span>
      </p>

      {sections.length === 0 ? (
        <div className="surface p-6 text-center">
          <p className="small-text">В этом разделе пока нет уроков.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {sections.map((section, sectionIndex) => (
            <div
              key={section.tier}
              className="fade-up section-spark rounded-[30px] px-2 py-3"
              style={{ animationDelay: `${Math.min(sectionIndex * 0.06, 0.2)}s` }}
            >
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-center">
                <h3 className="text-xl font-bold">{section.title}</h3>
                <span
                  className={`floating-chip rounded-full px-3 py-1 text-xs font-bold uppercase ${tierBadgeClass(section.tier)}`}
                >
                  {getTierLabel(section.tier)}
                </span>
              </div>

              <div className="mx-auto grid w-full justify-center gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,320px))]">
                {section.items.map((lesson, index) => (
                  <article
                    key={lesson.id}
                    className="surface lesson-card lift-card fade-up flex h-full w-full max-w-[320px] flex-col items-center p-4 text-center"
                    style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}
                  >
                    <div className="lesson-card-body">
                      <div className="flex w-full flex-wrap items-center justify-center gap-2">
                        <LessonCategoryChip category={lesson.category} />
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tierBadgeClass(lesson.required_tier)}`}
                        >
                          {getTierLabel(lesson.required_tier)}
                        </span>
                      </div>

                      <h4 className="mt-3 text-lg font-bold leading-snug">{lesson.title}</h4>
                      <p className="small-text mt-1">{lesson.short_description}</p>

                      <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide">
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">
                          {lesson.duration_minutes} мин
                        </span>
                        {lesson.completed ? (
                          <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">
                            Пройдено
                          </span>
                        ) : (
                          <span className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-800">
                            Не пройдено
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="lesson-card-actions">
                      <Link
                        href={`/dashboard/lessons/${lesson.id}`}
                        className="action-button primary-button w-full max-w-[220px] justify-center"
                      >
                        Открыть урок
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

