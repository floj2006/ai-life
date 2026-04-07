import type { SubmissionStatus } from "@/lib/types";

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  sent: "Новая",
  in_review: "На проверке",
  needs_revision: "Нужна доработка",
  approved: "Принято",
};

export const submissionStatusClasses: Record<SubmissionStatus, string> = {
  sent: "bg-slate-100 text-slate-800",
  in_review: "bg-blue-100 text-blue-800",
  needs_revision: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
};

export const submissionStatuses: SubmissionStatus[] = [
  "sent",
  "in_review",
  "needs_revision",
  "approved",
];

export const isSubmissionStatus = (
  value: string | null | undefined,
): value is SubmissionStatus => {
  if (!value) {
    return false;
  }

  return submissionStatuses.includes(value as SubmissionStatus);
};

