import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSeenAtIso } from "@/lib/submission-notifications";

type SubmissionRow = {
  id: string;
  status: string | null;
  updated_at: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Нужна авторизация." }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({
      hasUpdates: false,
      statusUpdates: 0,
      messageUpdates: 0,
    });
  }

  const url = new URL(request.url);
  const rawSince = url.searchParams.get("since");
  const sinceIso = parseSeenAtIso(rawSince) ?? new Date(0).toISOString();

  const submissionsResult = await admin
    .from("lesson_submissions")
    .select("id, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (submissionsResult.error) {
    return NextResponse.json(
      {
        error: submissionsResult.error.message,
      },
      { status: 400 },
    );
  }

  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
  if (submissions.length === 0) {
    return NextResponse.json({
      hasUpdates: false,
      statusUpdates: 0,
      messageUpdates: 0,
    });
  }

  const statusUpdates = submissions.filter((item) => {
    if (!item.updated_at || !item.status) {
      return false;
    }

    return item.status !== "sent" && item.updated_at > sinceIso;
  }).length;

  const submissionIds = submissions.map((item) => item.id);
  let messageUpdates = 0;

  if (submissionIds.length > 0) {
    const messagesResult = await admin
      .from("submission_messages")
      .select("id")
      .in("submission_id", submissionIds)
      .eq("author_role", "admin")
      .gt("created_at", sinceIso)
      .limit(200);

    if (!messagesResult.error) {
      messageUpdates = messagesResult.data?.length ?? 0;
    }
  }

  return NextResponse.json({
    hasUpdates: statusUpdates > 0 || messageUpdates > 0,
    statusUpdates,
    messageUpdates,
  });
}



