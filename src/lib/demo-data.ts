import { LESSONS_TOTAL } from "@/lib/lesson-stats";

export type DemoResult = {
  id: string;
  title: string;
  category: "photo" | "video" | "text" | "business" | "photosession";
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
    lessonsTotal: LESSONS_TOTAL,
    pendingFeedback: 2,
  },
  results: [
    {
      id: "r-photo",
      title: "Нейрофотосессия: деловой портрет",
      category: "photosession",
      preview:
        "Мягкий дневной свет, реалистичная кожа, аккуратный костюм и естественная поза без пластика.",
      qualityScore: 89,
      updatedAt: "обновлено 12 мин назад",
    },
    {
      id: "r-video",
      title: "Сценарий ролика на 10 секунд",
      category: "video",
      preview:
        "Сильный хук в первые 2 секунды, 2 короткие сцены и четкий финальный призыв.",
      qualityScore: 84,
      updatedAt: "обновлено 28 мин назад",
    },
    {
      id: "r-text",
      title: "Текст оффера для лендинга",
      category: "text",
      preview:
        "Понятная выгода, 3 аргумента и короткий CTA без воды и сложных формулировок.",
      qualityScore: 92,
      updatedAt: "обновлено 41 мин назад",
    },
  ],
};

