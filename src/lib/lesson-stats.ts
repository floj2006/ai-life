import lessonCatalogSource from "@/lib/lesson-catalog-data";
import type { LessonCategory, SubscriptionTier } from "@/lib/types";

type LessonCatalogEntry = {
  required_tier: SubscriptionTier;
  category: LessonCategory;
};

const { lessonCatalogData } = lessonCatalogSource as {
  lessonCatalogData: LessonCatalogEntry[];
};

const countBy = <T extends string>(items: T[]) =>
  items.reduce<Record<T, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);

export const LESSONS_TOTAL = lessonCatalogData.length;
export const LESSONS_TOTAL_LABEL = `${LESSONS_TOTAL} уроков`;

const tierCounts = countBy(lessonCatalogData.map((lesson) => lesson.required_tier));
const categoryCounts = countBy(lessonCatalogData.map((lesson) => lesson.category));

export const LESSON_COUNTS_BY_TIER: Record<SubscriptionTier, number> = {
  newbie: tierCounts.newbie ?? 0,
  start: tierCounts.start ?? 0,
  max: tierCounts.max ?? 0,
};

export const LESSON_COUNTS_BY_CATEGORY: Record<LessonCategory, number> = {
  photo: categoryCounts.photo ?? 0,
  photosession: categoryCounts.photosession ?? 0,
  video: categoryCounts.video ?? 0,
  text: categoryCounts.text ?? 0,
  business: categoryCounts.business ?? 0,
};

