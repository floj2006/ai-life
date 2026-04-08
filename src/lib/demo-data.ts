export type DemoResult = {
  id: string;
  title: string;
  category: "photo" | "video" | "text" | "business";
  preview: string;
  qualityScore: number;
  updatedAt: string;
};

export type DemoDashboardData = {
  user: {
    fullName: string;
    tier: "Новичок";
    lessonsCompleted: number;
    lessonsTotal: number;
    pendingFeedback: number;
  };
  results: DemoResult[];
};

export const demoDashboardData: DemoDashboardData = {
  user: {
    fullName: "Анна",
    tier: "Новичок",
    lessonsCompleted: 7,
    lessonsTotal: 50,
    pendingFeedback: 2,
  },
  results: [
    {
      id: "r-photo",
      title: "Портрет для профиля",
      category: "photo",
      preview:
        "Портрет в мягком дневном свете, естественные цвета, аккуратная кожа, чистый нейтральный фон.",
      qualityScore: 89,
      updatedAt: "обновлено 12 мин назад",
    },
    {
      id: "r-video",
      title: "Сценарий ролика на 15 секунд",
      category: "video",
      preview:
        "Хук в первые 2 секунды, 3 динамичные сцены и ясный финальный призыв написать в личные сообщения.",
      qualityScore: 84,
      updatedAt: "обновлено 28 мин назад",
    },
    {
      id: "r-text",
      title: "Текст оффера для лендинга",
      category: "text",
      preview:
        "Ясная выгода в первой строке, конкретные результаты и призыв к действию без воды.",
      qualityScore: 92,
      updatedAt: "обновлено 41 мин назад",
    },
  ],
};
