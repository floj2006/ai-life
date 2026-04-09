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
  replacementTips: string[];
  whyItWorks: string[];
  commonMistakes: string[];
};

type BeginnerPromptTemplateInput = {
  goal: string;
  category: LessonCategory;
  basePrompt: string;
  replaceHint: string;
  expectedResult: string;
};

const { lessonCatalogData } = lessonCatalogSource as {
  lessonCatalogData: CuratedLessonInput[];
};

const BEGINNER_PROMPT_HEADER = "Задача урока:";
const PROMPT_WARNING_HEADER = "Важно перед запуском (выбор за вами):";
const MAIN_NEURAL_NETWORK_LINKS = [
  "Syntx AI (все нейросети в одном месте): https://syntx.ai/welcome/cE7WYqi2",
  "ChatGPT: https://chatgpt.com",
  "Claude: https://claude.ai",
  "Gemini: https://gemini.google.com",
  "Midjourney: https://www.midjourney.com",
  "Runway: https://runwayml.com",
  "Pika: https://pika.art",
] as const;

const DEFAULT_VIDEO_BY_CATEGORY: Record<LessonCategory, string> = {
  photo: SYNTX_AI_URL,
  video: SYNTX_AI_URL,
  text: SYNTX_AI_URL,
  business: SYNTX_AI_URL,
  photosession: SYNTX_AI_URL,
};

export const lessonVideoOverrides: Record<LessonSlug, string> = {};

const DEFAULT_TOOLS: LessonTool[] = [{ name: "Syntx AI", url: SYNTX_AI_URL }];

const HOMEWORK_CHECKLIST_BY_CATEGORY: Record<LessonCategory, string[]> = {
  photo: [
    "Кадр сразу читается и решает задачу урока.",
    "Свет, лицо и детали выглядят естественно, без артефактов.",
    "В комментарии коротко указано, что вы заменили в промпте.",
  ],
  photosession: [
    "Сцена выглядит как реальная фотосессия, а не иллюстрация.",
    "Свет, кожа и ткань выглядят естественно, без «пластика».",
    "В комментарии указано, какие параметры съемки вы заменили.",
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
  photosession: [
    "Не указаны свет, объектив и параметры съемки.",
    "Слишком много стилистики в одном промпте.",
    "Нет уточнения по позе, выражению лица или фону.",
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
    primary: "Nano Banana Pro",
    alternatives: ["FLUX Pro", "Ideogram"],
    whenToUse: "Лучше всего подходит для фотореализма, света, фактуры и чистых визуалов.",
  },
  photosession: {
    primary: "Nano Banana Pro",
    alternatives: ["FLUX Pro", "Ideogram"],
    whenToUse: "Лучше всего подходит для реалистичных фотосессий с точным светом и кожей.",
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
      "Этот промпт объясняет нейросети, какое фото вам нужно: кто в кадре, какой свет и какая атмосфера.",
    replacementTips: [],
    whyItWorks: [
      "Свет и оптика сразу задают качественный визуальный характер.",
      "Уточнение реализма помогает избежать пластиковых лиц и грязных текстур.",
      "Коммерческие ориентиры делают фото пригодным для профиля, карточки или рекламы.",
    ],
    commonMistakes: [
      "Слишком общий запрос без света, ракурса и фона.",
      "Смешаны несовместимые стили в одном промпте.",
      "Не указан главный объект, из-за чего кадр получается размытым.",
    ],
  },
  photosession: {
    summary:
      "Этот промпт описывает полноценную фотосессию: кто в кадре, где снимаем и какой свет.",
    replacementTips: [],
    whyItWorks: [
      "Оптика и свет сразу задают реализм и качество кожи.",
      "Точные детали одежды и фона делают кадр цельным.",
      "Ограничение по стилю помогает избежать визуального шума.",
    ],
    commonMistakes: [
      "Нет уточнений про свет и локацию.",
      "Слишком много стилей в одном кадре.",
      "Не указана поза или эмоция модели.",
    ],
  },
  video: {
    summary:
      "Этот промпт помогает сделать короткий ролик: что происходит в кадре и какой эффект нужен.",
    replacementTips: [],
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
      "Этот промпт говорит нейросети, какой текст нужен, кому он адресован и чего вы ждете в конце.",
    replacementTips: [],
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
      "Этот промпт помогает получить понятный план: что делаем, для кого и какой результат нужен.",
    replacementTips: [],
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

const extractPromptPlaceholdersRaw = (value: string) => {
  const matches = value.match(/\{[^{}]+\}/g) ?? [];
  const unique = new Set<string>();

  for (const match of matches) {
    unique.add(normalizeInlineText(match));
  }

  return [...unique];
};

const buildHintPlaceholders = (replaceHint: string) => {
  const normalized = normalizeInlineText(replaceHint)
    .replace(/\s+и\s+/gi, ", ")
    .replace(/;/g, ",");

  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("{") ? item : `{${item}}`));
};

const resolvePromptPlaceholders = (basePrompt: string, replaceHint: string) => {
  const fromPrompt = extractPromptPlaceholdersRaw(basePrompt);
  const fromHint = buildHintPlaceholders(replaceHint);

  const unique = new Set<string>();
  for (const token of [...fromPrompt, ...fromHint]) {
    unique.add(token);
  }

  return [...unique];
};

const buildLessonId = (sortOrder: number) =>
  `00000000-0000-4000-8000-${String(sortOrder).padStart(12, "0")}`;

const buildLessonInstruction = (category: LessonCategory) => {
  if (category === "photo") {
    return "Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.";
  }

  if (category === "photosession") {
    return "Откройте Syntx AI, вставьте промпт для фотосессии, замените ключевые параметры и отправьте лучший кадр на проверку.";
  }

  if (category === "video") {
    return "Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.";
  }

  if (category === "business") {
    return "Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.";
  }

  return "Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.";
};

const PROMPT_STRUCTURE_BY_CATEGORY: Record<LessonCategory, string[]> = {
  photo: [
    "Кто в кадре: {герой}.",
    "Где снимаем: {локация} или {фон}.",
    "Свет и настроение: мягкий, естественный, без резких теней.",
    "Оптика и детализация: объектив, глубина резкости, фактура.",
    "Итог: реалистичный кадр без «пластика».",
  ],
  photosession: [
    "Кто в кадре: {герой}.",
    "Локация съемки: {локация} или {фон}.",
    "Свет: источник, мягкость, направление.",
    "Оптика: объектив и диафрагма.",
    "Итог: ощущение реальной фотосессии.",
  ],
  video: [
    "Формат: вертикальный 9:16, длительность до 10 секунд.",
    "Сюжет: {герой} делает {действие} или показывает {продукт}.",
    "Хук: сильный первый кадр.",
    "Свет и фон: чисто, без визуального шума.",
    "Итог: понятный короткий ролик с одной идеей.",
  ],
  text: [
    "Для кого: {аудитория}.",
    "Тема: {тема}.",
    "Структура: хук → суть → вывод → призыв.",
    "Тон: простой, дружелюбный, без воды.",
    "Итог: короткий текст, готовый к публикации.",
  ],
  business: [
    "Про что задача: {продукт} или {услуга}.",
    "Цель: {цель} в понятных цифрах.",
    "Шаги: что делать по порядку.",
    "Метрики: как понять, что работает.",
    "Итог: план действий без лишней теории.",
  ],
};

const getPromptStructure = (category: LessonCategory) => PROMPT_STRUCTURE_BY_CATEGORY[category];

const describeToken = (token: string, category: LessonCategory) => {
  const key = token.replace(/[{}]/g, "").trim().toLowerCase();

  if (/(герой|модель|человек)/.test(key)) {
    return "кто в кадре: пол, возраст, роль и внешний вид";
  }
  if (/эксперт/.test(key)) {
    return "кто говорит: специалист и его роль";
  }
  if (/(локация|место)/.test(key)) {
    return "где происходит съемка или действие";
  }
  if (/фон/.test(key)) {
    return "какой фон и насколько он нейтральный";
  }
  if (/товар/.test(key)) {
    return "какой товар показываем";
  }
  if (/продукт/.test(key)) {
    return "какой продукт или предложение описываем";
  }
  if (/услуга/.test(key)) {
    return "какая именно услуга и в чем ее польза";
  }
  if (/бренд/.test(key)) {
    return "название бренда или проекта";
  }
  if (/аудитория/.test(key)) {
    return "для кого текст или ролик: кто этот человек";
  }
  if (/ниша/.test(key)) {
    return "сфера бизнеса или тематика";
  }
  if (/тема/.test(key)) {
    return "о чем конкретно текст или ролик";
  }
  if (/кейс/.test(key)) {
    return "какой результат или история";
  }
  if (/процесс/.test(key)) {
    return "какое действие или шаги описываем";
  }
  if (/вопрос/.test(key)) {
    return "какой вопрос слышит зритель";
  }
  if (/контекст/.test(key)) {
    return "что уже произошло в диалоге";
  }
  if (/цель/.test(key)) {
    return "какого результата хотите";
  }
  if (/палитра/.test(key)) {
    return "какие основные цвета использовать";
  }
  if (/сфера/.test(key)) {
    return "в какой профессиональной сфере";
  }
  if (/предмет/.test(key)) {
    return "с чем взаимодействуют руки";
  }
  if (/действие/.test(key)) {
    return category === "video" ? "что делает герой в кадре" : "что делает персонаж";
  }

  return "что именно нужно подставить";
};

const FALLBACK_EXAMPLES: Record<LessonCategory, string[]> = {
  photo: [
    "портрет с естественным светом",
    "спокойная городская локация",
    "мягкий пастельный фон",
    "живой кадр без ретуши",
  ],
  photosession: [
    "фотосессия в кафе у окна",
    "мягкий свет от окна",
    "стиль: минимализм и теплые тона",
    "объектив 50 мм, мягкое боке",
  ],
  video: [
    "короткий ролик про продукт",
    "сильный хук в 1 секунду",
    "чистый фон и плавная камера",
    "действие в кадре без лишних сцен",
  ],
  text: [
    "простое объяснение без воды",
    "хук + 3 тезиса + призыв",
    "тон: дружелюбный и уверенный",
    "текст до 120 слов",
  ],
  business: [
    "цель: 10 заявок за неделю",
    "план из 3 понятных шагов",
    "метрика успеха: конверсия 3%",
    "следующий шаг: созвон",
  ],
};

const toExampleValue = (token: string, category: LessonCategory, index: number) => {
  const key = token.replace(/[{}]/g, "").trim().toLowerCase();

  if (/(герой|модель|человек)/.test(key)) {
    return "молодая женщина 28 лет, уверенная, в аккуратной одежде";
  }
  if (/эксперт/.test(key)) {
    return "эксперт по фитнесу";
  }
  if (/(локация|место)/.test(key)) {
    return "уютная кофейня с большими окнами";
  }
  if (/фон/.test(key)) {
    return "светло-серый фон без деталей";
  }
  if (/товар/.test(key)) {
    return "керамическая кружка";
  }
  if (/продукт/.test(key)) {
    return "онлайн-курс по английскому для начинающих";
  }
  if (/услуга/.test(key)) {
    return "дизайн логотипа для малого бизнеса";
  }
  if (/бренд/.test(key)) {
    return "CoffeeMood";
  }
  if (/аудитория/.test(key)) {
    return "начинающие предприниматели";
  }
  if (/ниша/.test(key)) {
    return "салоны красоты";
  }
  if (/тема/.test(key)) {
    return "как быстро оформить профиль";
  }
  if (/кейс/.test(key)) {
    return "рост заявок через сторис";
  }
  if (/процесс/.test(key)) {
    return "запуск рекламной кампании";
  }
  if (/вопрос/.test(key)) {
    return "Сколько стоит услуга?";
  }
  if (/контекст/.test(key)) {
    return "клиент спросил о сроках и цене";
  }
  if (/цель/.test(key)) {
    return "договориться о созвоне на этой неделе";
  }
  if (/палитра/.test(key)) {
    return "бежевый, темно-зеленый, белый";
  }
  if (/сфера/.test(key)) {
    return "маркетинг";
  }
  if (/предмет/.test(key)) {
    return "ноутбук";
  }
  if (/действие/.test(key)) {
    return category === "video" ? "показывает до/после" : "работает за ноутбуком";
  }

  const fallback = FALLBACK_EXAMPLES[category];
  return fallback[index % fallback.length];
};

const buildPromptExample = (
  prompt: string,
  category: LessonCategory,
  placeholders: string[],
) => {
  if (placeholders.length === 0) {
    return prompt;
  }

  return placeholders.reduce((acc, token, index) => {
    const value = toExampleValue(token, category, index);
    return acc.replaceAll(token, value);
  }, prompt);
};

const buildPromptWarningBlock = () => [
  PROMPT_WARNING_HEADER,
  "- Вы можете делать бесплатно: это возможно, но обычно дольше и сложнее по настройке.",
  "- Вы можете работать через Syntx AI: это платно, зато там уже собраны нейросети в одном месте и старт быстрее.",
  "- Вы можете использовать нейросети напрямую: гибко, но часто дороже при оплате каждого сервиса отдельно.",
  "Основные нейросети (официальные ссылки):",
  ...MAIN_NEURAL_NETWORK_LINKS.map((item) => `- ${item}`),
];

const injectWarningIntoExistingPromptTemplate = (prompt: string) => {
  if (prompt.includes(PROMPT_WARNING_HEADER)) {
    return prompt;
  }

  const marker = "\nСтруктура промпта:";
  if (prompt.includes(marker)) {
    return prompt.replace(
      marker,
      `\n${buildPromptWarningBlock().join("\n")}\n${marker}`,
    );
  }

  return `${prompt}\n\n${buildPromptWarningBlock().join("\n")}`;
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

  if (category === "photosession") {
    return [
      `Откройте Syntx AI и выберите модель ${model}.`,
      `Вставьте промпт фотосессии и замените ${replaceHint}.`,
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

const buildReplacementTips = (placeholders: string[], category: LessonCategory) => {
  if (placeholders.length === 0) {
    return PROMPT_EXPLAINERS[category].replacementTips.length > 0
      ? PROMPT_EXPLAINERS[category].replacementTips
      : [
          "Уточните ключевые данные задачи: кто, что, где и какой результат нужен.",
          "Добавьте конкретику: длительность, формат или стиль.",
          "Убедитесь, что в тексте есть понятная цель.",
        ];
  }

  return placeholders.map((token) => `${token} — ${describeToken(token, category)}.`);
};

export const getPromptExplainer = (
  category: LessonCategory,
  placeholders: string[] = [],
) => ({
  ...PROMPT_EXPLAINERS[category],
  replacementTips: buildReplacementTips(placeholders, category),
});

export const getPromptReplacementItems = (
  placeholders: string[],
  category: LessonCategory,
) =>
  placeholders.map((token, index) => ({
    token,
    description: describeToken(token, category),
    example: toExampleValue(token, category, index),
  }));

export const buildBeginnerPromptTemplate = ({
  goal,
  category,
  basePrompt,
  replaceHint,
  expectedResult,
}: BeginnerPromptTemplateInput) => {
  const prompt = normalizeMultilineText(basePrompt);
  const placeholders = resolvePromptPlaceholders(prompt, replaceHint);
  const placeholdersLine = placeholders.length > 0
    ? `Что заменить под себя: ${placeholders.join(", ")}.`
    : "";

  if (prompt.startsWith(BEGINNER_PROMPT_HEADER)) {
    return injectWarningIntoExistingPromptTemplate(prompt);
  }

  const guide = getSyntxModelGuide(category);
  const structureLines = getPromptStructure(category);
  const examplePrompt = buildPromptExample(prompt, category, placeholders);

  return [
    `${BEGINNER_PROMPT_HEADER} ${normalizeInlineText(goal)}`,
    `Рекомендуемая модель в Syntx AI: ${guide.primary}.`,
    "Перед запуском замените значения в фигурных скобках на свои данные.",
    placeholdersLine,
    "",
    ...buildPromptWarningBlock(),
    "",
    "Структура промпта:",
    ...structureLines.map((line) => `- ${line}`),
    "",
    "Промпт:",
    prompt,
    "",
    `Что должно получиться: ${normalizeInlineText(expectedResult)}`,
    "",
    "Пример заполнения:",
    examplePrompt,
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
      replaceHint: lesson.replace_hint,
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
    categoryCounts.photo !== 9 ||
    categoryCounts.photosession !== 6 ||
    categoryCounts.video !== 15 ||
    categoryCounts.text !== 10 ||
    categoryCounts.business !== 10
  ) {
    throw new Error(
      `Unexpected category split: photo=${categoryCounts.photo}, photosession=${categoryCounts.photosession}, video=${categoryCounts.video}, text=${categoryCounts.text}, business=${categoryCounts.business}`,
    );
  }
};

export const demoLessons: Lesson[] = lessonCatalogData.map(toLesson);

validateLessonCatalog(demoLessons);

const demoLessonBySlug = new Map(demoLessons.map((lesson) => [lesson.slug, lesson]));
const demoLessonById = new Map(demoLessons.map((lesson) => [lesson.id, lesson]));

export const lessonSlugs: LessonSlug[] = demoLessons.map((lesson) => lesson.slug);

export const extractPromptPlaceholders = (value: string) =>
  resolvePromptPlaceholders(value, "");

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
