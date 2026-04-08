import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import { findDemoLessonById } from "@/lib/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserRowExists } from "@/lib/supabase/ensure-user-row";
import {
  buildSubmissionStoragePath,
  getSubmissionMediaKindFromMime,
  MAX_SUBMISSION_FILE_SIZE_BYTES,
  MAX_SUBMISSION_FILE_SIZE_MB,
  parseStorageResultLink,
  SUBMISSION_MEDIA_BUCKET,
  toStorageResultLink,
} from "@/lib/submission-media";
import { sendNewSubmissionToAdmins } from "@/lib/notifications/email";
import {
  MAX_SUBMISSION_COMMENT_LENGTH,
  validateLessonOrSubmissionId,
  validateResultLink,
  validateTextInput,
} from "@/lib/submission-validation";
import {
  canAccessLessonTier,
  getTierLabel,
  normalizeSubscriptionTier,
  resolveLessonAccessTier,
} from "@/lib/subscription";
import { enforceRateLimit } from "@/lib/rate-limit";

type SubmissionPayload = {
  lessonId?: string;
  resultLink?: string;
  comment?: string;
};

type ParsedSubmissionInput = {
  lessonId: string;
  resultLink: string;
  comment: string;
  file: File | null;
};

type UserAccessRow = {
  is_pro: boolean | null;
  subscription_tier?: string | null;
};

type LessonAccessRow = {
  id: string;
  slug: string;
  is_premium: boolean;
  sort_order: number | null;
  title: string;
};

type ExistingSubmissionRow = {
  id: string;
  result_link: string | null;
};

type StudentProfileRow = {
  full_name: string | null;
  email: string | null;
};

const getDemoLessonById = (lessonId: string) => {
  return findDemoLessonById(lessonId);
};

const resolveLessonForSubmission = async ({
  lessonId,
  supabase,
}: {
  lessonId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<{ lesson: LessonAccessRow; resolvedLessonId: string } | null> => {
  const directLessonResult = await supabase
    .from("lessons")
    .select("id, slug, is_premium, sort_order, title")
    .eq("id", lessonId)
    .maybeSingle();

  if (!directLessonResult.error && directLessonResult.data) {
    const lesson = directLessonResult.data as LessonAccessRow;
    return { lesson, resolvedLessonId: lesson.id };
  }

  const demoLesson = getDemoLessonById(lessonId);
  if (!demoLesson) {
    return null;
  }

  const admin = createAdminClient();

  const bySlugResult = await admin
    .from("lessons")
    .select("id, slug, is_premium, sort_order, title")
    .eq("slug", demoLesson.slug)
    .maybeSingle();

  if (!bySlugResult.error && bySlugResult.data) {
    const lesson = bySlugResult.data as LessonAccessRow;
    return { lesson, resolvedLessonId: lesson.id };
  }

  const upsertResult = await admin
    .from("lessons")
    .upsert(
      {
        id: demoLesson.id,
        slug: demoLesson.slug,
        title: demoLesson.title,
        short_description: demoLesson.short_description,
        video_url: demoLesson.video_url,
        instruction: demoLesson.instruction,
        ai_tool_url: demoLesson.ai_tool_url,
        duration_minutes: demoLesson.duration_minutes,
        sort_order: demoLesson.sort_order,
        is_premium: demoLesson.is_premium,
        goal: demoLesson.goal,
        steps: demoLesson.steps,
        prompt_template: demoLesson.prompt_template,
        expected_result: demoLesson.expected_result,
        category: demoLesson.category,
      },
      { onConflict: "slug", ignoreDuplicates: false },
    )
    .select("id, slug, is_premium, sort_order, title")
    .maybeSingle();

  if (!upsertResult.error && upsertResult.data) {
    const lesson = upsertResult.data as LessonAccessRow;
    return { lesson, resolvedLessonId: lesson.id };
  }

  const retryBySlugResult = await admin
    .from("lessons")
    .select("id, slug, is_premium, sort_order, title")
    .eq("slug", demoLesson.slug)
    .maybeSingle();

  if (!retryBySlugResult.error && retryBySlugResult.data) {
    const lesson = retryBySlugResult.data as LessonAccessRow;
    return { lesson, resolvedLessonId: lesson.id };
  }

  return null;
};

const isMissingTierColumnError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("subscription_tier") && normalized.includes("column");
};

const isBucketMissingError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("bucket") && normalized.includes("not found");
};

const isBucketAlreadyExistsError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("already exists");
};

const isObjectTooLargeError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("maximum allowed size") ||
    normalized.includes("entity too large") ||
    normalized.includes("payload too large")
  );
};

const ensureSubmissionBucket = async (admin: ReturnType<typeof createAdminClient>) => {
  const bucket = await admin.storage.getBucket(SUBMISSION_MEDIA_BUCKET);

  if (!bucket.error) {
    return;
  }

  if (!isBucketMissingError(bucket.error.message)) {
    throw new Error(bucket.error.message);
  }

  const create = await admin.storage.createBucket(SUBMISSION_MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_SUBMISSION_FILE_SIZE_BYTES}B`,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
  });

  if (create.error && !isBucketAlreadyExistsError(create.error.message)) {
    throw new Error(create.error.message);
  }
};

const parseSubmissionInput = async (request: Request): Promise<ParsedSubmissionInput> => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const lessonId = String(formData.get("lessonId") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();
    const fileValue = formData.get("resultFile");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    return {
      lessonId,
      comment,
      resultLink: "",
      file,
    };
  }

  const payload = (await request.json()) as SubmissionPayload;

  return {
    lessonId: payload.lessonId?.trim() ?? "",
    resultLink: payload.resultLink?.trim() ?? "",
    comment: payload.comment?.trim() ?? "",
    file: null,
  };
};

const getUserAccessRow = async (
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) => {
  const withTier = await supabase
    .from("users")
    .select("is_pro, subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (!withTier.error) {
    return withTier.data as UserAccessRow | null;
  }

  if (!isMissingTierColumnError(withTier.error.message)) {
    return null;
  }

  const legacy = await supabase
    .from("users")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();

  if (legacy.error) {
    return null;
  }

  return legacy.data as UserAccessRow | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация." }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");

  if (scope === "all" && isAdminEmail(user.email)) {
    if (!admin) {
      return NextResponse.json(
        { error: "Не настроен SUPABASE_SERVICE_ROLE_KEY для просмотра всех заданий." },
        { status: 500 },
      );
    }

    const { data, error } = await admin
      .from("lesson_submissions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  }

  const { data, error } = await supabase
    .from("lesson_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация." }, { status: 401 });
  }

  const rateLimitResponse = enforceRateLimit({
    bucket: "submission-create",
    limit: 6,
    windowMs: 10 * 60 * 1000,
    request,
    userId: user.id,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let input: ParsedSubmissionInput;
  try {
    input = await parseSubmissionInput(request);
  } catch {
    return NextResponse.json({ error: "Некорректные данные формы." }, { status: 400 });
  }

  const lessonId = input.lessonId;
  let resultLink = input.resultLink;
  const file = input.file;

  if (!validateLessonOrSubmissionId(lessonId)) {
    return NextResponse.json({ error: "Некорректный идентификатор урока." }, { status: 400 });
  }

  if (!file && !resultLink) {
    return NextResponse.json(
      { error: `Загрузите файл результата (изображение или видео, до ${MAX_SUBMISSION_FILE_SIZE_MB} МБ).` },
      { status: 400 },
    );
  }

  const validatedComment = validateTextInput({
    value: input.comment,
    maxLength: MAX_SUBMISSION_COMMENT_LENGTH,
    tooLongError: `Комментарий слишком длинный. Максимум ${MAX_SUBMISSION_COMMENT_LENGTH} символов.`,
    required: false,
  });

  if (!validatedComment.ok) {
    return NextResponse.json({ error: validatedComment.error }, { status: 400 });
  }

  const comment = validatedComment.value;

  if (!file) {
    const validatedLink = validateResultLink(resultLink);

    if (!validatedLink.ok) {
      return NextResponse.json({ error: validatedLink.error }, { status: 400 });
    }

    resultLink = validatedLink.value;
  }

  const resolvedLessonResult = await resolveLessonForSubmission({ lessonId, supabase });
  if (!resolvedLessonResult) {
    return NextResponse.json({ error: "Урок не найден." }, { status: 404 });
  }

  const { lesson, resolvedLessonId } = resolvedLessonResult;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Не настроен SUPABASE_SERVICE_ROLE_KEY для записи задания." },
      { status: 500 },
    );
  }
  const userSyncError = await ensureUserRowExists(admin, user);
  if (userSyncError) {
    return NextResponse.json(
      {
        error:
          "Не удалось синхронизировать профиль пользователя в таблице users. Проверьте SQL-миграцию и повторите попытку.",
      },
      { status: 500 },
    );
  }

  const existingSubmissionResult = await admin
    .from("lesson_submissions")
    .select("id, result_link")
    .eq("user_id", user.id)
    .eq("lesson_id", resolvedLessonId)
    .maybeSingle();

  if (existingSubmissionResult.error) {
    return NextResponse.json({ error: existingSubmissionResult.error.message }, { status: 400 });
  }

  const existingSubmission = existingSubmissionResult.data as ExistingSubmissionRow | null;
  const isNewSubmission = !existingSubmission;
  const submittedAtIso = new Date().toISOString();
  const demoLesson = getDemoLessonById(lessonId);

  const [userAccess, studentProfileResult] = await Promise.all([
    getUserAccessRow(user.id, supabase),
    supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const authTierRaw =
    typeof user.user_metadata?.subscription_tier === "string"
      ? user.user_metadata.subscription_tier
      : typeof user.app_metadata?.subscription_tier === "string"
        ? user.app_metadata.subscription_tier
        : undefined;
  const authIsPro =
    user.user_metadata?.is_pro === true || user.app_metadata?.is_pro === true;
  const tier = normalizeSubscriptionTier(
    userAccess?.subscription_tier ?? authTierRaw,
    userAccess?.is_pro ?? authIsPro,
  );
  const studentProfile = studentProfileResult.data as StudentProfileRow | null;

  const requiredTier = resolveLessonAccessTier({
    isPremium: lesson.is_premium,
    sortOrder: lesson.sort_order,
  });

  if (!canAccessLessonTier(tier, requiredTier)) {
    return NextResponse.json(
      { error: `Для заданий этого урока нужен тариф ${getTierLabel(requiredTier)}.` },
      { status: 403 },
    );
  }

  let uploadedStoragePath: string | null = null;

  if (file) {
    const mediaKind = getSubmissionMediaKindFromMime(file.type);

    if (!mediaKind) {
      return NextResponse.json(
        { error: "Поддерживаются только изображения и видео (JPG, PNG, WEBP, HEIC, MP4, WEBM, MOV)." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SUBMISSION_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Файл слишком большой. Максимум ${MAX_SUBMISSION_FILE_SIZE_MB} МБ.` },
        { status: 400 },
      );
    }

    try {
      await ensureSubmissionBucket(admin);

      const storagePath = buildSubmissionStoragePath({
        userId: user.id,
        lessonId: resolvedLessonId,
        kind: mediaKind,
        fileName: file.name,
        mimeType: file.type,
      });
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const upload = await admin.storage
        .from(SUBMISSION_MEDIA_BUCKET)
        .upload(storagePath, fileBuffer, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (upload.error) {
        if (isObjectTooLargeError(upload.error.message)) {
          return NextResponse.json(
            { error: `Файл слишком большой. Максимум ${MAX_SUBMISSION_FILE_SIZE_MB} МБ.` },
            { status: 400 },
          );
        }

        return NextResponse.json({ error: upload.error.message }, { status: 400 });
      }

      uploadedStoragePath = storagePath;
      resultLink = toStorageResultLink(storagePath);
    } catch (uploadError) {
      if (
        uploadError instanceof Error &&
        isObjectTooLargeError(uploadError.message)
      ) {
        return NextResponse.json(
          { error: `Файл слишком большой. Максимум ${MAX_SUBMISSION_FILE_SIZE_MB} МБ.` },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : "Не удалось загрузить файл результата.",
        },
        { status: 400 },
      );
    }
  }

  const { data: submission, error: submissionError } = await admin
    .from("lesson_submissions")
    .upsert(
      {
        user_id: user.id,
        lesson_id: resolvedLessonId,
        status: "sent",
        result_link: resultLink || existingSubmission?.result_link || null,
        student_comment: comment,
        updated_at: submittedAtIso,
      },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (submissionError || !submission) {
    if (uploadedStoragePath) {
      await admin.storage.from(SUBMISSION_MEDIA_BUCKET).remove([uploadedStoragePath]);
    }

    return NextResponse.json(
      { error: submissionError?.message ?? "Не удалось отправить задание." },
      { status: 400 },
    );
  }

  const previousStorage = parseStorageResultLink(existingSubmission?.result_link);
  const nextStorage = parseStorageResultLink(resultLink);

  if (
    previousStorage &&
    previousStorage.bucket === SUBMISSION_MEDIA_BUCKET &&
    previousStorage.path !== nextStorage?.path
  ) {
    await admin.storage.from(SUBMISSION_MEDIA_BUCKET).remove([previousStorage.path]);
  }

  if (comment) {
    const { error: messageError } = await admin.from("submission_messages").insert({
      submission_id: submission.id,
      author_id: user.id,
      author_role: "student",
      message: comment,
    });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 400 });
    }
  }

  if (isNewSubmission) {
    void sendNewSubmissionToAdmins({
      lessonTitle: demoLesson?.title ?? lesson.title,
      studentName: studentProfile?.full_name ?? user.user_metadata?.full_name ?? null,
      studentEmail: user.email ?? studentProfile?.email ?? null,
      submittedAtIso,
    }).catch((error) => {
      console.error("[submissions] Failed to send new-submission notification.", error);
    });
  }

  return NextResponse.json({ ok: true, submissionId: submission.id });
}




