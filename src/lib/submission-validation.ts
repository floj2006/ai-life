export const MAX_SUBMISSION_COMMENT_LENGTH = 2_000;
export const MAX_SUBMISSION_MESSAGE_LENGTH = 2_000;
export const MAX_RESULT_LINK_LENGTH = 1_500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SQL_META_RE = /;|--|\/\*|\*\//;

const normalizeText = (value: string) =>
  value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();

export const isUuid = (value: string) => UUID_RE.test(value);

export const validateLessonOrSubmissionId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (SQL_META_RE.test(trimmed)) {
    return false;
  }
  return isUuid(trimmed);
};

export const containsSqlMeta = (value: string | undefined | null) => {
  if (!value) {
    return false;
  }
  return SQL_META_RE.test(value);
};

export const findSqlMetaInParams = (params: Record<string, string>) => {
  for (const [key, value] of Object.entries(params)) {
    if (containsSqlMeta(value)) {
      return { key, value };
    }
  }
  return null;
};

export const validateResultLink = (value: string) => {
  const normalized = value.trim();

  if (!normalized) {
    return { ok: true as const, value: "" };
  }

  if (normalized.length > MAX_RESULT_LINK_LENGTH) {
    return {
      ok: false as const,
      error: `Ссылка слишком длинная. Максимум ${MAX_RESULT_LINK_LENGTH} символов.`,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return { ok: false as const, error: "Ссылка результата должна быть полной и корректной." };
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return { ok: false as const, error: "Разрешены только ссылки http:// или https://." };
  }

  return { ok: true as const, value: normalized };
};

export const validateTextInput = ({
  value,
  maxLength,
  emptyError,
  tooLongError,
  required,
}: {
  value: string | undefined | null;
  maxLength: number;
  emptyError?: string;
  tooLongError: string;
  required: boolean;
}) => {
  const normalized = normalizeText(value ?? "");

  if (!normalized) {
    if (required) {
      return { ok: false as const, error: emptyError ?? "Поле обязательно." };
    }

    return { ok: true as const, value: "" };
  }

  if (normalized.length > maxLength) {
    return { ok: false as const, error: tooLongError };
  }

  return { ok: true as const, value: normalized };
};
