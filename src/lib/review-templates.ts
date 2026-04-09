import type { SubmissionStatus } from "@/lib/types";

export type ReviewCommentTemplate = {
  id: string;
  label: string;
  statuses: SubmissionStatus[];
  message: string;
};

export const reviewCommentTemplates: ReviewCommentTemplate[] = [
  {
    id: "in-review-started",
    label: "Взял в работу",
    statuses: ["sent", "in_review"],
    message:
      "Задание взял в работу. Сейчас быстро проверю детали и вернусь с понятной обратной связью.",
  },
  {
    id: "needs-revision-focus",
    label: "Нужна 1-2 правки",
    statuses: ["needs_revision"],
    message:
      "Хорошая база уже есть. Доработайте 1-2 момента: точнее попадите в цель урока и немного усилите качество результата. После правок отправьте обновленную версию.",
  },
  {
    id: "needs-revision-prompt",
    label: "Уточнить промпт",
    statuses: ["needs_revision"],
    message:
      "Вижу потенциал, но промпт пока слишком общий. Уточните объект, контекст, стиль и ожидаемый результат, затем пересоберите итог и отправьте повторно.",
  },
  {
    id: "approved-strong",
    label: "Принято, отлично",
    statuses: ["approved"],
    message:
      "Отличная работа, задание принято. Результат соответствует цели урока. Следующий шаг: сделайте еще 1-2 варианта на своей теме, чтобы закрепить навык.",
  },
  {
    id: "approved-solid",
    label: "Принято, можно усилить",
    statuses: ["approved"],
    message:
      "Задание принято. Основа сделана правильно. Если хотите усилить результат, попробуйте более смелую версию: улучшите хук, композицию или точность промпта.",
  },
];

export const getReviewTemplatesForStatus = (status: SubmissionStatus) => {
  return reviewCommentTemplates.filter((item) => item.statuses.includes(status));
};
