import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import { findDemoLessonById, findDemoLessonBySlug } from "@/lib/content";
import {
  sendNewStudentMessageToAdmins,
  sendSubmissionMessageToStudent,
} from "@/lib/notifications/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserRowExists } from "@/lib/supabase/ensure-user-row";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  MAX_SUBMISSION_MESSAGE_LENGTH,
  validateLessonOrSubmissionId,
  validateTextInput,
} from "@/lib/submission-validation";

type MessagePayload = {
  message?: string;
};

type RouteContext = {
  params: Promise<{ submissionId: string }>;
};

type SubmissionOwnerRow = {
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

const resolveSubmissionForUser = async ({
  admin,
  submissionId,
  userId,
  isAdmin,
}: {
  admin: ReturnType<typeof createAdminClient>;
  submissionId: string;
  userId: string;
  isAdmin: boolean;
}) => {
  const submissionResult = await admin
    .from("lesson_submissions")
    .select("id, user_id, lesson_id, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionResult.error || !submissionResult.data) {
    return { error: "Submission not found", status: 404 as const, row: null };
  }

  const row = submissionResult.data as SubmissionOwnerRow & { status?: string };
  if (!isAdmin && row.user_id !== userId) {
    return { error: "Forbidden", status: 403 as const, row: null };
  }

  return { error: null, status: 200 as const, row };
};

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Не настроен SUPABASE_SERVICE_ROLE_KEY для загрузки сообщений." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await context.params;
  if (!validateLessonOrSubmissionId(submissionId)) {
    return NextResponse.json({ error: "Некорректный идентификатор задания." }, { status: 400 });
  }

  const isAdmin = isAdminEmail(user.email);
  const submissionAccess = await resolveSubmissionForUser({
    admin,
    submissionId,
    userId: user.id,
    isAdmin,
  });
  if (submissionAccess.error) {
    return NextResponse.json({ error: submissionAccess.error }, { status: submissionAccess.status });
  }

  const [messagesResult, submissionStatusResult] = await Promise.all([
    admin
      .from("submission_messages")
      .select("id, submission_id, author_id, author_role, message, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true }),
    admin
      .from("lesson_submissions")
      .select("status")
      .eq("id", submissionId)
      .maybeSingle(),
  ]);

  if (messagesResult.error) {
    return NextResponse.json({ error: messagesResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    items: messagesResult.data ?? [],
    status:
      typeof submissionStatusResult.data?.status === "string"
        ? submissionStatusResult.data.status
        : null,
  });
}

const resolveLessonTitle = async (
  admin: ReturnType<typeof createAdminClient>,
  lessonId: string,
) => {
  const direct = findDemoLessonById(lessonId);
  if (direct) {
    return direct.title;
  }

  const lessonReferenceResult = await admin
    .from("lessons")
    .select("slug")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonReferenceResult.error || !lessonReferenceResult.data?.slug) {
    return "Урок";
  }

  const lessonReference = lessonReferenceResult.data as LessonReferenceRow;
  if (!lessonReference.slug) {
    return "Урок";
  }

  return findDemoLessonBySlug(lessonReference.slug)?.title ?? "Урок";
};

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Не настроен SUPABASE_SERVICE_ROLE_KEY для отправки сообщений." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = isAdminEmail(user.email);
  const rateLimitResponse = enforceRateLimit({
    bucket: isAdmin ? "submission-admin-message" : "submission-student-message",
    limit: isAdmin ? 80 : 25,
    windowMs: 10 * 60 * 1000,
    request,
    userId: user.id,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  const userSyncError = await ensureUserRowExists(admin, user);
  if (userSyncError) {
    return NextResponse.json(
      {
        error:
          "Не удалось синхронизировать профиль автора в таблице users. Проверьте SQL-миграцию.",
      },
      { status: 500 },
    );
  }

  const { submissionId } = await context.params;
  if (!validateLessonOrSubmissionId(submissionId)) {
    return NextResponse.json({ error: "Некорректный идентификатор задания." }, { status: 400 });
  }

  let payload: MessagePayload;
  try {
    payload = (await request.json()) as MessagePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validatedMessage = validateTextInput({
    value: payload.message,
    maxLength: MAX_SUBMISSION_MESSAGE_LENGTH,
    emptyError: "Сообщение обязательно.",
    tooLongError: `Сообщение слишком длинное. Максимум ${MAX_SUBMISSION_MESSAGE_LENGTH} символов.`,
    required: true,
  });

  if (!validatedMessage.ok) {
    return NextResponse.json({ error: validatedMessage.error }, { status: 400 });
  }
  const message = validatedMessage.value;

  if (isAdmin) {
    const submissionAccess = await resolveSubmissionForUser({
      admin,
      submissionId,
      userId: user.id,
      isAdmin: true,
    });
    if (submissionAccess.error || !submissionAccess.row) {
      return NextResponse.json(
        { error: submissionAccess.error ?? "Submission not found" },
        { status: submissionAccess.status ?? 404 },
      );
    }
    const submission = submissionAccess.row;

    const { error: insertError } = await admin.from("submission_messages").insert({
      submission_id: submissionId,
      author_id: user.id,
      author_role: "admin",
      message,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    await admin
      .from("lesson_submissions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", submissionId);

    const row = submission as SubmissionOwnerRow;
    const [lessonTitle, studentResult] = await Promise.all([
      resolveLessonTitle(admin, row.lesson_id),
      admin.from("users").select("full_name, email").eq("id", row.user_id).maybeSingle(),
    ]);
    const student = studentResult.data as StudentRow | null;

    void sendSubmissionMessageToStudent({
      studentEmail: student?.email ?? null,
      studentName: student?.full_name ?? null,
      lessonTitle,
      message,
    }).catch((error) => {
      console.error("[submission-messages] Failed to notify student.", error);
    });

    return NextResponse.json({ ok: true });
  }

  const submissionAccess = await resolveSubmissionForUser({
    admin,
    submissionId,
    userId: user.id,
    isAdmin: false,
  });
  if (submissionAccess.error || !submissionAccess.row) {
    return NextResponse.json(
      { error: submissionAccess.error ?? "Submission not found" },
      { status: submissionAccess.status ?? 404 },
    );
  }

  const row = submissionAccess.row;
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("submission_messages").insert({
    submission_id: submissionId,
    author_id: user.id,
    author_role: "student",
    message,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin
    .from("lesson_submissions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", submissionId);

  const lessonTitle = await resolveLessonTitle(admin, row.lesson_id);
  void sendNewStudentMessageToAdmins({
    lessonTitle,
    studentName: user.user_metadata?.full_name ?? null,
    studentEmail: user.email ?? null,
    message,
  }).catch((notifyError) => {
    console.error("[submission-messages] Failed to notify admins.", notifyError);
  });

  return NextResponse.json({ ok: true });
}
