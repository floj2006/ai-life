import { findDemoLessonById, findDemoLessonBySlug } from "@/lib/content";
import type { Lesson } from "@/lib/types";

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

export const collectUnresolvedLessonIds = (lessonIds: string[]) => {
  return [...new Set(lessonIds.filter((lessonId) => !findDemoLessonById(lessonId)))];
};

export const buildDbLessonReferenceMap = (rows: LessonReferenceRow[]) => {
  const referenceMap = new Map<string, Lesson>();

  for (const row of rows) {
    if (!row.slug) {
      continue;
    }

    const demoLesson = findDemoLessonBySlug(row.slug);
    if (!demoLesson) {
      continue;
    }

    referenceMap.set(row.id, demoLesson);
  }

  return referenceMap;
};

export const resolveDemoLessonFromReference = (
  lessonId: string,
  referenceMap: Map<string, Lesson>,
) => {
  return findDemoLessonById(lessonId) ?? referenceMap.get(lessonId);
};
