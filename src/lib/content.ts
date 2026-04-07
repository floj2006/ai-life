import lessonCatalogSource from "@/lib/lesson-catalog-data";
import type {
  Lesson,
  LessonCategory,
  LessonTool,
  QuickAction,
  SubscriptionTier,
} from "@/lib/types";

export const SYNTX_AI_URL = "https://syntx.ai/welcome/cE7WYqi2";

export type LessonSlug = string;

type CuratedLessonInput = {
  slug: LessonSlug;
  category: LessonCategory;
  required_tier: SubscriptionTier;
  title: string;
  short_description: string;
  duration_minutes: number;
  goal: string;
  replace_hint: string;
  review_focus: string;
  prompt_template: string;
  expected_result: string;
};

type SyntxModelGuide = {
  primary: string;
  alternatives: string[];
  whenToUse: string;
};

type PromptExplainer = {
  summary: string;
  whatToReplace: string[];
  whyItWorks: string[];
  commonMistakes: string[];
};

type BeginnerPromptTemplateInput = {
  goal: string;
  category: LessonCategory;
  basePrompt: string;
  expectedResult: string;
};

const { lessonCatalogData } = lessonCatalogSource as {
  lessonCatalogData: CuratedLessonInput[];
};

const BEGINNER_PROMPT_HEADER = "Задача урока:";

const DEFAULT_VIDEO_BY_CATEGORY: Record<LessonCategory, string> = {
  photo: SYNTX_AI_URL,
  video: SYNTX_AI_URL,
  text: SYNTX_AI_URL,
  business: SYNTX_AI_URL,
};

export const lessonVideoOverrides: Record<LessonSlug, string> = {};

const DEFAULT_TOOLS: LessonTool[] = [{ name: "Syntx AI", url: SYNTX_AI_URL }];

const HOMEWORK_CHECKLIST_BY_CATEGORY: Record<LessonCategory, string[]> = {
  photo: [
    "Кадр сразу читается и решает задачу урока.",
    "Свет, лицо и детали выглядят естественно, без артефактов.",
    "В комментарии коротко указано, что вы заменили в промпте.",
  ],
  video: [
    "У ролика сильный первый кадр и понятный финал.",
    "Сцена короткая, собранная и без визуального хаоса.",
    "В комментарии указано, какие правки улучшили результат.",
  ],
  text: [
    "Текст легко читается: есть хук, суть и понятное действие.",
    "Фразы короткие и конкретные, без воды.",
    "В комментарии указано, для кого адаптирован итоговый вариант.",
  ],
  business: [
    "Результат привязан к реальной задаче бизнеса.",
    "Есть понятные шаги, логика и критерий успеха.",
    "В комментарии указано, как вы примените это в работе.",
  ],
};

const HOMEWORK_COMMON_MISTAKES_BY_CATEGORY: Record<LessonCategory, string[]> = {
  photo: [
    "Слишком общий запрос без света, ракурса и стиля.",
    "Смешаны несовместимые стили в одном промпте.",
    "Перед отправкой не выбран лучший кадр из нескольких вариантов.",
  ],
  video: [
    "В один ролик пытаются уместить слишком много идей.",
    "Не указан формат, длительность или движение камеры.",
    "Первый кадр слабый и не цепляет внимание.",
  ],
  text: [
    "Не указаны аудитория и цель текста.",
    "Слишком длинные формулировки вместо простых.",
    "В конце нет понятного CTA.",
  ],
  business: [
    "Нет измеримой цели в цифрах.",
    "План слишком общий и без приоритетов.",
    "Не продуман риск и запасной сценарий.",
  ],
};

const SYNTX_MODEL_GUIDES: Record<LessonCategory, SyntxModelGuide> = {
  photo: {
    primary: "FLUX Pro",
    alternatives: ["Ideogram", "Recraft"],
    whenToUse: "Лучше всего подходит для фотореализма, света, фактуры и чистых визуалов.",
  },
  video: {
    primary: "Kling",
    alternatives: ["Runway", "Pika"],
    whenToUse: "Подходит для коротких роликов, движения камеры и живых сцен.",
  },
  text: {
    primary: "GPT-4.1",
    alternatives: ["Claude", "Gemini"],
    whenToUse: "Лучше всего подходит для постов, писем и понятных текстов без воды.",
  },
  business: {
    primary: "Claude",
    alternatives: ["GPT-4.1", "Gemini"],
    whenToUse: "Хорошо работает для стратегии, анализа, офферов и структурных бизнес-задач.",
  },
};

const PROMPT_EXPLAINERS: Record<LessonCategory, PromptExplainer> = {
  photo: {
    summary:
      "Промпт для фото задает свет, стиль, композицию и реализм, поэтому результат получается чище и естественнее.",
    whatToReplace: [
      "{человек} или {герой} — кто в центре кадра.",
      "{товар}, {сцена}, {фон} — что именно показываем и в каком контексте.",
      "{палитра}, {настроение} — какая атмосфера нужна в кадре.",
    ],
    whyItWorks: [
      "Свет и оптика сразу задают качественный визуальный характер.",
      "Уточнение реализма помогает избежать пластиковых лиц и грязных текстур.",
      "Коммерческие ориентиры делают фото пригодным для профиля, карточки или рекламы.",
    ],
    commonMistakes: [
      "Слишком общий запрос без света и композиции.",
      "Слишком много разных стилей в одном промпте.",
      "Нет ограничений на реализм, из-за чего лицо или товар плывут.",
    ],
  },
  video: {
    summary:
      "Промпт для видео фиксирует сюжет, движение камеры и формат, поэтому генерация становится стабильнее и понятнее.",
    whatToReplace: [
      "{герой}, {эксперт} — кто в центре ролика.",
      "{продукт}, {сцена}, {тема} — что именно показываем и какую мысль доносим.",
      "Первые секунды ролика — какой кадр должен зацепить зрителя сразу.",
    ],
    whyItWorks: [
      "Ограничение по длительности и сценам снижает хаос.",
      "Описание движения камеры делает ролик более живым и киношным.",
      "Формат 9:16 сразу оптимизирует результат под короткие видео.",
    ],
    commonMistakes: [
      "Слишком много смыслов в одном коротком ролике.",
      "Не указаны длительность, формат или первый кадр.",
      "Слишком общий сценарий без эмоции и действия.",
    ],
  },
  text: {
    summary:
      "Промпт для текста заранее задает структуру, поэтому AI пишет не простыню, а материал, который можно использовать сразу.",
    whatToReplace: [
      "{тема} — о чем текст.",
      "{аудитория} — для кого он написан.",
      "{продукт}, {контекст}, {цель} — деловая рамка задачи.",
    ],
    whyItWorks: [
      "Хук, суть и CTA удерживают внимание и ведут к действию.",
      "Ограничение по объему убирает воду.",
      "Несколько вариантов помогают быстро выбрать лучшую подачу.",
    ],
    commonMistakes: [
      "Не указана аудитория.",
      "Слишком длинное ТЗ без структуры.",
      "В тексте нет понятного действия для читателя.",
    ],
  },
  business: {
    summary:
      "Промпт для бизнеса переводит идею в рабочий план: шаги, метрики, риски и следующий практический шаг.",
    whatToReplace: [
      "{ниша}, {продукт}, {услуга} — о каком бизнесе речь.",
      "{цель} — измеримая цель в деньгах, лидах или заявках.",
      "Контекст применения — где именно вы используете результат: воронка, оффер, созвон, тариф или запуск.",
    ],
    whyItWorks: [
      "Метрики и дедлайны делают ответ прикладным.",
      "Сценарий риска помогает не застрять после первой неудачи.",
      "На выходе получается рабочий документ, а не абстрактный совет.",
    ],
    commonMistakes: [
      "Нет конкретной цели в цифрах.",
      "Запрос слишком общий и без рамок по времени.",
      "Игнорируются риски и альтернативные действия.",
    ],
  },
};

const normalizeInlineText = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeMultilineText = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

const buildLessonId = (sortOrder: number) =>
  `00000000-0000-4000-8000-${String(sortOrder).padStart(12, "0")}`;

const buildLessonInstruction = (category: LessonCategory) => {
  if (category === "photo") {
    return "Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.";
  }

  if (category === "video") {
    return "Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.";
  }

  if (category === "business") {
    return "Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.";
  }

  return "Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.";
};

const buildLessonSteps = (
  category: LessonCategory,
  replaceHint: string,
  reviewFocus: string,
) => {
  const model = getSyntxModelGuide(category).primary;

  if (category === "photo") {
    return [
      `Откройте Syntx AI и выберите модель ${model}.`,
      `Вставьте промпт и замените ${replaceHint}.`,
      `Сделайте 3 варианта и сравните их по ${reviewFocus}.`,
      "Сохраните лучший кадр и отправьте его на проверку.",
    ];
  }

  if (category === "video") {
    return [
      `Откройте Syntx AI и выберите модель ${model}.`,
      `Вставьте промпт и замените ${replaceHint}.`,
      `Соберите 2-3 версии и сравните их по ${reviewFocus}.`,
      "Сохраните лучший ролик и отправьте его на проверку.",
    ];
  }

  if (category === "business") {
    return [
      `Откройте Syntx AI и выберите модель ${model}.`,
      `Вставьте промпт и подставьте ${replaceHint}.`,
      `Попросите 2-3 варианта и оцените их по ${reviewFocus}.`,
      "Сохраните лучший вариант и отправьте его на проверку с коротким комментарием.",
    ];
  }

  return [
    `Откройте Syntx AI и выберите модель ${model}.`,
    `Вставьте промпт и замените ${replaceHint}.`,
    `Соберите 2-3 версии и выберите лучшую по ${reviewFocus}.`,
    "Сохраните готовый текст и отправьте его на проверку.",
  ];
};

export const resolveLessonVideoUrl = (
  slug: LessonSlug,
  category: LessonCategory,
  fallbackUrl?: string | null,
) => lessonVideoOverrides[slug] ?? fallbackUrl ?? DEFAULT_VIDEO_BY_CATEGORY[category];

export const resolveLessonTools = (
  _slug: LessonSlug,
  _category: LessonCategory,
  aiToolUrl?: string | null,
  fallbackTools?: LessonTool[] | null,
): LessonTool[] => {
  if (fallbackTools && fallbackTools.length > 0) {
    return fallbackTools;
  }

  return [{ name: "Syntx AI", url: aiToolUrl ?? SYNTX_AI_URL }];
};

export const getSyntxModelGuide = (category: LessonCategory) => SYNTX_MODEL_GUIDES[category];

export const getHomeworkChecklist = (category: LessonCategory) =>
  HOMEWORK_CHECKLIST_BY_CATEGORY[category];

export const getHomeworkCommonMistakes = (category: LessonCategory) =>
  HOMEWORK_COMMON_MISTAKES_BY_CATEGORY[category];

export const getPromptExplainer = (category: LessonCategory) => PROMPT_EXPLAINERS[category];

export const buildBeginnerPromptTemplate = ({
  goal,
  category,
  basePrompt,
  expectedResult,
}: BeginnerPromptTemplateInput) => {
  const prompt = normalizeMultilineText(basePrompt);

  if (prompt.startsWith(BEGINNER_PROMPT_HEADER)) {
    return prompt;
  }

  const guide = getSyntxModelGuide(category);

  return [
    `${BEGINNER_PROMPT_HEADER} ${normalizeInlineText(goal)}`,
    `Рекомендуемая модель в Syntx AI: ${guide.primary}.`,
    "Перед запуском замените значения в фигурных скобках на свои данные.",
    "",
    "Промпт:",
    prompt,
    "",
    `Что должно получиться: ${normalizeInlineText(expectedResult)}`,
  ].join("\n");
};

const toLesson = (lesson: CuratedLessonInput, index: number): Lesson => {
  const sortOrder = index + 1;
  const goal = normalizeInlineText(lesson.goal);
  const expectedResult = normalizeInlineText(lesson.expected_result);
  const basePrompt = normalizeMultilineText(lesson.prompt_template);

  return {
    id: buildLessonId(sortOrder),
    slug: lesson.slug,
    title: normalizeInlineText(lesson.title),
    short_description: normalizeInlineText(lesson.short_description),
    video_url: resolveLessonVideoUrl(lesson.slug, lesson.category),
    instruction: buildLessonInstruction(lesson.category),
    ai_tool_url: SYNTX_AI_URL,
    duration_minutes: lesson.duration_minutes,
    sort_order: sortOrder,
    is_premium: lesson.required_tier === "max",
    required_tier: lesson.required_tier,
    goal,
    steps: buildLessonSteps(
      lesson.category,
      normalizeInlineText(lesson.replace_hint),
      normalizeInlineText(lesson.review_focus),
    ),
    prompt_template: buildBeginnerPromptTemplate({
      goal,
      category: lesson.category,
      basePrompt,
      expectedResult,
    }),
    expected_result: expectedResult,
    category: lesson.category,
    tools: [...DEFAULT_TOOLS],
  };
};

const countBy = <T extends string>(items: T[]) =>
  items.reduce<Record<T, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);

const validateLessonCatalog = (lessons: Lesson[]) => {
  if (lessons.length !== 50) {
    throw new Error(`Expected 50 lessons, received ${lessons.length}.`);
  }

  const slugSet = new Set<string>();
  const titleSet = new Set<string>();
  const sortOrderSet = new Set<number>();
  const fingerprintSet = new Set<string>();

  for (const lesson of lessons) {
    if (slugSet.has(lesson.slug)) {
      throw new Error(`Duplicate lesson slug detected: ${lesson.slug}`);
    }
    slugSet.add(lesson.slug);

    const normalizedTitle = lesson.title.trim().toLowerCase();
    if (titleSet.has(normalizedTitle)) {
      throw new Error(`Duplicate lesson title detected: ${lesson.title}`);
    }
    titleSet.add(normalizedTitle);

    if (sortOrderSet.has(lesson.sort_order)) {
      throw new Error(`Duplicate lesson sort_order detected: ${lesson.sort_order}`);
    }
    sortOrderSet.add(lesson.sort_order);

    const fingerprint = [
      lesson.title.trim().toLowerCase(),
      lesson.short_description.trim().toLowerCase(),
      lesson.goal.trim().toLowerCase(),
      lesson.prompt_template.trim().toLowerCase(),
    ].join("::");

    if (fingerprintSet.has(fingerprint)) {
      throw new Error(`Duplicate lesson content fingerprint detected: ${lesson.slug}`);
    }
    fingerprintSet.add(fingerprint);
  }

  const tierCounts = countBy(lessons.map((lesson) => lesson.required_tier));
  if (tierCounts.newbie !== 6 || tierCounts.start !== 26 || tierCounts.max !== 18) {
    throw new Error(
      `Unexpected tier split: newbie=${tierCounts.newbie}, start=${tierCounts.start}, max=${tierCounts.max}`,
    );
  }

  const categoryCounts = countBy(lessons.map((lesson) => lesson.category));
  if (
    categoryCounts.photo !== 15 ||
    categoryCounts.video !== 15 ||
    categoryCounts.text !== 10 ||
    categoryCounts.business !== 10
  ) {
    throw new Error(
      `Unexpected category split: photo=${categoryCounts.photo}, video=${categoryCounts.video}, text=${categoryCounts.text}, business=${categoryCounts.business}`,
    );
  }
};

export const demoLessons: Lesson[] = lessonCatalogData.map(toLesson);

validateLessonCatalog(demoLessons);

const demoLessonBySlug = new Map(demoLessons.map((lesson) => [lesson.slug, lesson]));
const demoLessonById = new Map(demoLessons.map((lesson) => [lesson.id, lesson]));

export const lessonSlugs: LessonSlug[] = demoLessons.map((lesson) => lesson.slug);

export const findDemoLessonBySlug = (slug: string) =>
  demoLessonBySlug.get(slug);

export const findDemoLessonById = (id: string) =>
  demoLessonById.get(id);

const QUICK_ACTION_SOURCE: Record<QuickAction["slug"], LessonSlug> = {
  avatar: "photo-start",
  video: "video-reels",
  text: "text-post",
};

const buildQuickAction = (slug: QuickAction["slug"]): QuickAction => {
  const lesson = findDemoLessonBySlug(QUICK_ACTION_SOURCE[slug]);

  if (!lesson) {
    throw new Error(`Quick action source lesson not found: ${slug}`);
  }

  const titleBySlug: Record<QuickAction["slug"], string> = {
    avatar: "Сделать аватар",
    video: "Сделать видео",
    text: "Написать текст",
  };

  const subtitleBySlug: Record<QuickAction["slug"], string> = {
    avatar: "Быстрый старт для чистой аватарки без пластика.",
    video: "Соберите короткий ролик с понятным первым кадром.",
    text: "Подготовьте готовый текст без воды и лишней сложности.",
  };

  return {
    slug,
    title: titleBySlug[slug],
    subtitle: subtitleBySlug[slug],
    promptTemplate: lesson.prompt_template,
    tools: lesson.tools,
    steps: lesson.steps,
  };
};

const QUICK_ACTION_ORDER: QuickAction["slug"][] = ["avatar", "video", "text"];

export const quickActions: QuickAction[] = QUICK_ACTION_ORDER.map(buildQuickAction);
