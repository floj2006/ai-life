export type SubmissionMediaKind = "image" | "video";

export const SUBMISSION_MEDIA_BUCKET = "submission-results";

export const MAX_SUBMISSION_FILE_SIZE_BYTES = 45 * 1024 * 1024;
export const MAX_SUBMISSION_FILE_SIZE_MB = Math.round(
  MAX_SUBMISSION_FILE_SIZE_BYTES / 1024 / 1024,
);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

export const ACCEPTED_SUBMISSION_FILE_TYPES = [
  ...Array.from(IMAGE_MIME_TYPES),
  ...Array.from(VIDEO_MIME_TYPES),
].join(",");

const MIME_EXTENSION_FALLBACK: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const normalizeExtension = (value: string | undefined | null) => {
  if (!value) {
    return "";
  }

  return value.trim().replace(/^\./, "").toLowerCase();
};

const extensionFromFileName = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }

  return normalizeExtension(fileName.slice(dotIndex + 1));
};

export const getSubmissionMediaKindFromMime = (
  mimeType: string | undefined | null,
): SubmissionMediaKind | null => {
  const normalized = (mimeType ?? "").trim().toLowerCase();

  if (IMAGE_MIME_TYPES.has(normalized)) {
    return "image";
  }

  if (VIDEO_MIME_TYPES.has(normalized)) {
    return "video";
  }

  return null;
};

const isKnownImageExtension = (ext: string) => IMAGE_EXTENSIONS.has(ext);
const isKnownVideoExtension = (ext: string) => VIDEO_EXTENSIONS.has(ext);

export const getSubmissionFileExtension = (
  fileName: string,
  mimeType: string,
  kind: SubmissionMediaKind,
) => {
  const byName = extensionFromFileName(fileName);
  if (kind === "image" && isKnownImageExtension(byName)) {
    return byName;
  }
  if (kind === "video" && isKnownVideoExtension(byName)) {
    return byName;
  }

  const byMime = normalizeExtension(MIME_EXTENSION_FALLBACK[mimeType]);
  if (byMime) {
    return byMime;
  }

  return kind === "image" ? "jpg" : "mp4";
};

export const buildSubmissionStoragePath = (params: {
  userId: string;
  lessonId: string;
  kind: SubmissionMediaKind;
  fileName: string;
  mimeType: string;
}) => {
  const ext = getSubmissionFileExtension(
    params.fileName,
    params.mimeType,
    params.kind,
  );
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${params.userId}/${params.lessonId}/${params.kind}/${Date.now()}-${token}.${ext}`;
};

export const toStorageResultLink = (path: string) => {
  return `storage://${SUBMISSION_MEDIA_BUCKET}/${path}`;
};

export const isExternalResultLink = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  return value.startsWith("https://") || value.startsWith("http://");
};

const inferMediaKindFromPath = (path: string): SubmissionMediaKind | null => {
  if (path.includes("/image/")) {
    return "image";
  }

  if (path.includes("/video/")) {
    return "video";
  }

  const extension = extensionFromFileName(path);
  if (isKnownImageExtension(extension)) {
    return "image";
  }
  if (isKnownVideoExtension(extension)) {
    return "video";
  }

  return null;
};

export type ParsedStorageResultLink = {
  bucket: string;
  path: string;
  kind: SubmissionMediaKind | null;
};

export const parseStorageResultLink = (
  value: string | null | undefined,
): ParsedStorageResultLink | null => {
  if (!value || !value.startsWith("storage://")) {
    return null;
  }

  const raw = value.slice("storage://".length);
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0) {
    return null;
  }

  const bucket = raw.slice(0, slashIndex);
  const path = raw.slice(slashIndex + 1);

  if (!path) {
    return null;
  }

  return {
    bucket,
    path,
    kind: inferMediaKindFromPath(path),
  };
};
