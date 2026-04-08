import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin-access";
import { findDemoLessonById, findDemoLessonBySlug } from "@/lib/content";
import { sendSubmissionStatusToStudent } from "@/lib/notifications/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isSubmissionStatus, submissionStatusLabels } from "@/lib/submissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserRowExists } from "@/lib/supabase/ensure-user-row";
import { createClient } from "@/lib/supabase/server";
import { logAdminAuditEvent } from "@/lib/telemetry";
import {
  MAX_SUBMISSION_MESSAGE_LENGTH,
  validateLessonOrSubmissionId,
  validateTextInput,
} from "@/lib/submission-validation";
import type { Lesson, SubmissionStatus } from "@/lib/types";

type PatchPayload = {
  status?: SubmissionStatus;
  message?: string;
};

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

type SubmissionRow = {
  id: string;
  status: SubmissionStatus;
  user_id: string;
  lesson_id: string;
};

type StudentRow = {
  full_name: string | null;
  email: string | null;
};

type LessonReferenceRow = {
  slug: string | null;
};

type ResolvedLessonMeta = {
  title: string;
  demoLesson: Lesson | null;
};

const resolveLessonMeta = async (
  admin: ReturnType<typeof createAdminClient>,
  lessonId: string,
): Promise<ResolvedLessonMeta> => {
  const directLesson = findDemoLessonById(lessonId);
  if (directLesson) {
    return {
      title: directLesson.title,
      demoLesson: directLesson,
    };
  }

  const lessonReferenceResult = await admin
    .from("lessons")
    .select("slug")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonReferenceResult.error || !lessonReferenceResult.data?.slug) {
    return {
      title: "Урок",
      demoLesson: null,
    };
  }

  const lessonReference = lessonReferenceResult.data as LessonReferenceRow;
  if (!lessonReference.slug) {
    return {
      title: "Урок",
      demoLesson: null,
    };
  }

  const demoLesson = findDemoLessonBySlug(lessonReference.slug) ?? null;

  return {
    title: demoLesson?.title ?? "Урок",
    demoLesson,
  };
};

const syncProgressFromStatus = async ({
  admin,
  submission,
  nextStatus,
}: {
  admin: ReturnType<typeof createAdminClient>;
  submission: SubmissionRow;
  nextStatus: SubmissionStatus;
}) => {
  const completed = nextStatus === "approved";

  const { error } = await admin.from("progress").upsert(
    {
      user_id: submission.user_id,
      lesson_id: submission.lesson_id,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,lesson_id",
      ignoreDuplicates: false,
    },
  );

  return error;
};

const revalidateSubmissionViews = (demoLesson: Lesson | null) => {
  revalidatePath("/dashboard");
  revalidatePath("/submissions");
  revalidatePath("/review");
  revalidatePath("/admin");

  if (demoLesson) {
    revalidatePath(`/dashboard/lessons/${demoLesson.id}`);
    revalidatePath(`/dashboard/lessons/${demoLesson.slug}`);
  }
};

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация." }, { status: 401 });
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  }

  const rateLimitResponse = enforceRateLimit({
    bucket: "submission-status-update",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    request,
    userId: user.id,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { submissionId } = await context.params;
  if (!validateLessonOrSubmissionId(submissionId)) {
    return NextResponse.json({ error: "Некорректный идентификатор задания." }, { status: 400 });
  }

  let payload: PatchPayload;
  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "Некорректный формат запроса." }, { status: 400 });
  }

  if (!isSubmissionStatus(payload.status)) {
    return NextResponse.json({ error: "Указан неверный статус." }, { status: 400 });
  }

  const validatedMessage = validateTextInput({
    value: payload.message,
    maxLength: MAX_SUBMISSION_MESSAGE_LENGTH,
    tooLongError: `Комментарий слишком длинный. Максимум ${MAX_SUBMISSION_MESSAGE_LENGTH} символов.`,
    required: false,
  });

  if (!validatedMessage.ok) {
    return NextResponse.json({ error: validatedMessage.error }, { status: 400 });
  }

  const message = validatedMessage.value;
  const admin = createAdminClient();
  const reviewerSyncError = await ensureUserRowExists(admin, user);
  if (reviewerSyncError) {
    return NextResponse.json(
      {
        error:
          "Не удалось синхронизировать профиль проверяющего в таблице users. Проверьте SQL-миграцию.",
      },
      { status: 500 },
    );
  }

  const { data: existingSubmission, error: existingSubmissionError } = await admin
    .from("lesson_submissions")
    .select("id, status, user_id, lesson_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (existingSubmissionError || !existingSubmission) {
    return NextResponse.json(
      { error: existingSubmissionError?.message ?? "Задание не найдено." },
      { status: 404 },
    );
  }

  const currentSubmission = existingSubmission as SubmissionRow;

  const { error: updateError } = await admin
    .from("lesson_submissions")
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const progressSyncError = await syncProgressFromStatus({
    admin,
    submission: currentSubmission,
    nextStatus: payload.status,
  });

  if (progressSyncError) {
    return NextResponse.json({ error: progressSyncError.message }, { status: 400 });
  }

  if (message) {
    const { error: messageError } = await admin.from("submission_messages").insert({
      submission_id: submissionId,
      author_id: user.id,
      author_role: "admin",
      message,
    });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 400 });
    }
  }

  const lessonMeta = await resolveLessonMeta(admin, currentSubmission.lesson_id);
  revalidateSubmissionViews(lessonMeta.demoLesson);

  await logAdminAuditEvent({
    actorUserId: user.id,
    actorEmail: user.email ?? null,
    action: "submission_status_updated",
    targetUserId: currentSubmission.user_id,
    targetSubmissionId: submissionId,
    metadata: {
      previousStatus: currentSubmission.status,
      nextStatus: payload.status,
      lessonId: currentSubmission.lesson_id,
      lessonTitle: lessonMeta.title,
      withComment: Boolean(message),
    },
  });

  if (currentSubmission.status !== payload.status) {
    const studentResult = await admin
      .from("users")
      .select("full_name, email")
      .eq("id", currentSubmission.user_id)
      .maybeSingle();

    const student = studentResult.data as StudentRow | null;

    void sendSubmissionStatusToStudent({
      studentEmail: student?.email ?? null,
      studentName: student?.full_name ?? null,
      lessonTitle: lessonMeta.title,
      statusLabel: submissionStatusLabels[payload.status],
      reviewerComment: message,
    }).catch((error) => {
      console.error("[submissions] Failed to notify student about status update.", error);
    });
  }

  return NextResponse.json({ ok: true });
}


