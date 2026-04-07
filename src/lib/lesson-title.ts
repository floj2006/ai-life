const GENERATED_TIER_SUFFIX = /\s+\((Newbie|Start|Max)(?:\s+#\d{1,3})?\)$/u;

export const cleanLessonTitle = (title: string | null | undefined) => {
  if (!title) {
    return "Урок";
  }

  return title.replace(GENERATED_TIER_SUFFIX, "").trim();
};
