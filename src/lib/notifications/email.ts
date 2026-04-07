import "server-only";
import { Resend } from "resend";
import { getAdminEmails } from "@/lib/admin-access";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

type NewSubmissionEmailInput = {
  lessonTitle: string;
  studentName?: string | null;
  studentEmail?: string | null;
  submittedAtIso: string;
};

type StudentStatusEmailInput = {
  studentEmail?: string | null;
  studentName?: string | null;
  lessonTitle: string;
  statusLabel: string;
  reviewerComment?: string;
};

type StudentMessageEmailInput = {
  studentEmail?: string | null;
  studentName?: string | null;
  lessonTitle: string;
  message: string;
};

type AdminMessageEmailInput = {
  lessonTitle: string;
  studentName?: string | null;
  studentEmail?: string | null;
  message: string;
};

const normalizeBaseUrl = (value: string | undefined) => {
  if (!value) {
    return "http://localhost:3000";
  }

  return value.trim().replace(/\/+$/, "");
};

const getReviewUrl = () => `${normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)}/review`;
const getSubmissionsUrl = () =>
  `${normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)}/submissions`;

const getResendConfig = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    return null;
  }

  return { apiKey, fromEmail };
};

const formatDateTimeRu = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const sendEmail = async (input: SendEmailInput) => {
  const config = getResendConfig();
  if (!config) {
    console.warn(
      "[notifications] Skip email: RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    );
    return;
  }

  try {
    const resend = new Resend(config.apiKey);

    await resend.emails.send({
      from: config.fromEmail,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (error) {
    console.error("[notifications] Failed to send email via Resend.", error);
  }
};

export const sendNewSubmissionToAdmins = async (input: NewSubmissionEmailInput) => {
  const admins = getAdminEmails();
  if (admins.length === 0) {
    return;
  }

  const studentLabel =
    input.studentName && input.studentName.trim().length > 0
      ? `${input.studentName}${input.studentEmail ? ` (${input.studentEmail})` : ""}`
      : input.studentEmail ?? "Ученик без email";
  const submittedAt = formatDateTimeRu(input.submittedAtIso);
  const reviewUrl = getReviewUrl();

  const subject = `Новое задание на проверку: ${input.lessonTitle}`;
  const text = [
    "Поступило новое задание на проверку.",
    "",
    `Урок: ${input.lessonTitle}`,
    `Ученик: ${studentLabel}`,
    `Время отправки: ${submittedAt}`,
    "",
    `Открыть проверку: ${reviewUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">Поступило новое задание</h2>
      <p style="margin: 0 0 8px;"><strong>Урок:</strong> ${input.lessonTitle}</p>
      <p style="margin: 0 0 8px;"><strong>Ученик:</strong> ${studentLabel}</p>
      <p style="margin: 0 0 16px;"><strong>Время отправки:</strong> ${submittedAt}</p>
      <a href="${reviewUrl}" style="display:inline-block;padding:10px 14px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;">
        Открыть проверку
      </a>
    </div>
  `;

  await sendEmail({
    to: admins,
    subject,
    text,
    html,
  });
};

export const sendSubmissionStatusToStudent = async (
  input: StudentStatusEmailInput,
) => {
  const to = input.studentEmail?.trim();
  if (!to) {
    return;
  }

  const submissionsUrl = getSubmissionsUrl();
  const studentName =
    input.studentName && input.studentName.trim().length > 0
      ? input.studentName
      : "ученик";
  const commentLine = input.reviewerComment
    ? `Комментарий проверяющего: ${input.reviewerComment}`
    : "Комментарий проверяющего: без комментария";

  const subject = `Статус задания обновлен: ${input.statusLabel}`;
  const text = [
    `Здравствуйте, ${studentName}!`,
    "",
    `Урок: ${input.lessonTitle}`,
    `Новый статус: ${input.statusLabel}`,
    commentLine,
    "",
    `Открыть раздел с заданиями: ${submissionsUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">Статус задания обновлен</h2>
      <p style="margin: 0 0 8px;">Здравствуйте, ${studentName}!</p>
      <p style="margin: 0 0 8px;"><strong>Урок:</strong> ${input.lessonTitle}</p>
      <p style="margin: 0 0 8px;"><strong>Новый статус:</strong> ${input.statusLabel}</p>
      <p style="margin: 0 0 16px;"><strong>Комментарий:</strong> ${input.reviewerComment || "без комментария"}</p>
      <a href="${submissionsUrl}" style="display:inline-block;padding:10px 14px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;">
        Открыть мои задания
      </a>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendSubmissionMessageToStudent = async (
  input: StudentMessageEmailInput,
) => {
  const to = input.studentEmail?.trim();
  if (!to) {
    return;
  }

  const submissionsUrl = getSubmissionsUrl();
  const studentName =
    input.studentName && input.studentName.trim().length > 0
      ? input.studentName
      : "ученик";
  const shortMessage = input.message.trim().slice(0, 300);
  const subject = `Новое сообщение по заданию: ${input.lessonTitle}`;

  const text = [
    `Здравствуйте, ${studentName}!`,
    "",
    `По уроку «${input.lessonTitle}» пришел новый комментарий от проверяющего.`,
    "",
    `Сообщение: ${shortMessage}`,
    "",
    `Открыть чат по заданию: ${submissionsUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">Новое сообщение от проверяющего</h2>
      <p style="margin: 0 0 8px;"><strong>Урок:</strong> ${input.lessonTitle}</p>
      <p style="margin: 0 0 16px;"><strong>Сообщение:</strong> ${shortMessage}</p>
      <a href="${submissionsUrl}" style="display:inline-block;padding:10px 14px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;">
        Открыть чат по заданию
      </a>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendNewStudentMessageToAdmins = async (
  input: AdminMessageEmailInput,
) => {
  const admins = getAdminEmails();
  if (admins.length === 0) {
    return;
  }

  const reviewUrl = getReviewUrl();
  const studentLabel =
    input.studentName && input.studentName.trim().length > 0
      ? `${input.studentName}${input.studentEmail ? ` (${input.studentEmail})` : ""}`
      : input.studentEmail ?? "ученик";
  const shortMessage = input.message.trim().slice(0, 300);
  const subject = `Новое сообщение ученика: ${input.lessonTitle}`;

  const text = [
    "В чате задания появилось новое сообщение от ученика.",
    "",
    `Урок: ${input.lessonTitle}`,
    `Ученик: ${studentLabel}`,
    `Сообщение: ${shortMessage}`,
    "",
    `Открыть проверку: ${reviewUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">Новое сообщение ученика</h2>
      <p style="margin: 0 0 8px;"><strong>Урок:</strong> ${input.lessonTitle}</p>
      <p style="margin: 0 0 8px;"><strong>Ученик:</strong> ${studentLabel}</p>
      <p style="margin: 0 0 16px;"><strong>Сообщение:</strong> ${shortMessage}</p>
      <a href="${reviewUrl}" style="display:inline-block;padding:10px 14px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;">
        Открыть проверку
      </a>
    </div>
  `;

  await sendEmail({
    to: admins,
    subject,
    text,
    html,
  });
};
