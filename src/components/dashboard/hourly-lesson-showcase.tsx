"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LessonCategoryChip } from "@/components/dashboard/lesson-category-chip";
import type { LessonWithProgress } from "@/lib/types";

type HourlyLessonShowcaseProps = {
  lessons: LessonWithProgress[];
};

const buildHourSeed = (date: Date) => {
  return Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
      date.getUTCDate(),
    ).padStart(2, "0")}${String(date.getUTCHours()).padStart(2, "0")}`,
  );
};

const pickShowcaseLessons = (lessons: LessonWithProgress[], seed: number) => {
  if (lessons.length === 0) {
    return [];
  }

  const sorted = [...lessons].sort((left, right) => left.sort_order - right.sort_order);
  const startIndex = seed % sorted.length;
  const picked: LessonWithProgress[] = [];

  for (let index = 0; index < Math.min(3, sorted.length); index += 1) {
    const item = sorted[(startIndex + index * 3) % sorted.length];
    if (item && !picked.some((lesson) => lesson.id === item.id)) {
      picked.push(item);
    }
  }

  return picked;
};

const formatHourLabel = (date: Date) =>
  date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function HourlyLessonShowcase({ lessons }: HourlyLessonShowcaseProps) {
  const [currentHourSeed, setCurrentHourSeed] = useState(() => buildHourSeed(new Date()));
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const now = new Date();
      const nextSeed = buildHourSeed(now);
      if (nextSeed !== currentHourSeed) {
        setCurrentHourSeed(nextSeed);
        setUpdatedAt(now);
      }
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [currentHourSeed]);

  const showcaseLessons = useMemo(
    () => pickShowcaseLessons(lessons, currentHourSeed),
    [currentHourSeed, lessons],
  );

  if (showcaseLessons.length === 0) {
    return null;
  }

  const gridLayout =
    showcaseLessons.length === 1
      ? "md:grid-cols-1 md:max-w-md"
      : showcaseLessons.length === 2
        ? "md:grid-cols-2 md:max-w-3xl"
        : "md:grid-cols-3";

  return (
    <section className="surface section-spark p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
            Витрина уроков
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">Подборка часа</h2>
          <p className="small-text mt-2 max-w-[60ch]">
            Обновляем выбор каждые 60 минут. Это удобный быстрый старт, если не хочется искать
            в полном каталоге.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-sky-900 ring-1 ring-cyan-100">
            Обновлено: {formatHourLabel(updatedAt)}
          </span>
          <Link
            href="#course-catalog"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Весь каталог
          </Link>
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${gridLayout} md:mx-auto`}>
        {showcaseLessons.map((lesson) => (
          <article
            key={lesson.id}
            className="flex h-full flex-col rounded-2xl bg-white/92 p-4 ring-1 ring-[var(--line)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <LessonCategoryChip category={lesson.category} />
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                {lesson.duration_minutes} мин
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold leading-snug">{lesson.title}</h3>
            <p className="small-text mt-1">{lesson.short_description}</p>
            <Link
              href={`/dashboard/lessons/${lesson.id}`}
              className="action-button primary-button mt-4 w-full"
            >
              Открыть урок
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
