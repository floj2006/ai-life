import { requireUser } from "@/lib/auth";
import { demoLessons } from "@/lib/content";
import {
  buildDbLessonReferenceMap,
  collectUnresolvedLessonIds,
  resolveDemoLessonFromReference,
} from "@/lib/lesson-reference";
import { canAccessLessonTier, normalizeSubscriptionTier } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lesson, LessonWithProgress, UserProfile } from "@/lib/types";
import { unstable_cache, unstable_noStore as noStore } from "next/cache";

type RawUserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_pro: boolean | null;
  subscription_tier?: string | null;
};

type CompletedLessonRow = {
  lesson_id: string;
};

type LessonReferenceRow = {
  id: string;
  slug: string | null;
};

const LESSON_CATALOG_CACHE_SECONDS = 300;

const cloneLesson = (lesson: Lesson): Lesson => ({
  ...lesson,
  steps: [...lesson.steps],
  tools: lesson.tools.map((tool) => ({ ...tool })),
});

const mergeLessonsAndProgress = (
  lessons: Lesson[],
  completedRows: CompletedLessonRow[],
  lessonReferenceMap: Map<string, Lesson>,
): LessonWithProgress[] => {
  const completedLessonSlugs = new Set(
    completedRows
      .map((item) => resolveDemoLessonFromReference(item.lesson_id, lessonReferenceMap)?.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );

  return lessons.map((lesson) => ({
    ...lesson,
    completed: completedLessonSlugs.has(lesson.slug),
  }));
};

const isMissingTierColumnError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("subscription_tier") && normalized.includes("column");
};

const loadRawProfile = async (
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) => {
  const profileWithTierResult = await admin
    .from("users")
    .select("id, full_name, email, is_pro, subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (!profileWithTierResult.error) {
    return profileWithTierResult.data as RawUserProfile | null;
  }

  if (!isMissingTierColumnError(profileWithTierResult.error.message)) {
    return null;
  }

  const legacyProfileResult = await admin
    .from("users")
    .select("id, full_name, email, is_pro")
    .eq("id", userId)
    .maybeSingle();

  if (legacyProfileResult.error) {
    return null;
  }

  return legacyProfileResult.data as RawUserProfile | null;
};

const ensureProfileBootstrap = async (
  admin: ReturnType<typeof createAdminClient>,
  user: Awaited<ReturnType<typeof requireUser>>["user"],
) => {
  const profileBootstrapResult = await admin.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      is_pro: false,
      subscription_tier: "newbie",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (
    profileBootstrapResult.error &&
    isMissingTierColumnError(profileBootstrapResult.error.message)
  ) {
    await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        is_pro: false,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }
};

const getCachedLessonCatalog = unstable_cache(
  async () => demoLessons.map(cloneLesson),
  ["dashboard-lesson-catalog-v5"],
  { revalidate: LESSON_CATALOG_CACHE_SECONDS },
);

const syncApprovedLessonsToProgress = async (
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  approvedRows: CompletedLessonRow[],
  progressRows: CompletedLessonRow[],
) => {
  const existingProgressLessonIds = new Set(progressRows.map((item) => item.lesson_id));
  const missingProgressRows = approvedRows.filter(
    (item) => !existingProgressLessonIds.has(item.lesson_id),
  );

  if (missingProgressRows.length === 0) {
    return;
  }

  await admin.from("progress").upsert(
    missingProgressRows.map((item) => ({
      user_id: userId,
      lesson_id: item.lesson_id,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    {
      onConflict: "user_id,lesson_id",
      ignoreDuplicates: false,
    },
  );
};

export const getDashboardData = async () => {
  noStore();

  const { user } = await requireUser();
  const admin = createAdminClient();

  const lessonsPromise = getCachedLessonCatalog();
  const rawProfilePromise = loadRawProfile(admin, user.id);
  const approvedSubmissionsPromise = admin
    .from("lesson_submissions")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("status", "approved");
  const progressRowsPromise = admin
    .from("progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("completed", true);

  let rawProfile = await rawProfilePromise;
  if (!rawProfile) {
    await ensureProfileBootstrap(admin, user);
    rawProfile = await loadRawProfile(admin, user.id);
  }

  const [lessons, approvedSubmissionsResult, progressRowsResult] = await Promise.all([
    lessonsPromise,
    approvedSubmissionsPromise,
    progressRowsPromise,
  ]);

  const approvedRows = (approvedSubmissionsResult.error
    ? []
    : approvedSubmissionsResult.data ?? []) as CompletedLessonRow[];
  const progressRows = (progressRowsResult.error
    ? []
    : progressRowsResult.data ?? []) as CompletedLessonRow[];

  await syncApprovedLessonsToProgress(admin, user.id, approvedRows, progressRows);

  const completionRows = [...approvedRows, ...progressRows];

  const unresolvedLessonIds = collectUnresolvedLessonIds(
    completionRows.map((item) => item.lesson_id),
  );

  const lessonReferenceResult =
    unresolvedLessonIds.length > 0
      ? await admin.from("lessons").select("id, slug").in("id", unresolvedLessonIds)
      : { data: [], error: null };

  const lessonReferenceRows = lessonReferenceResult.error
    ? []
    : ((lessonReferenceResult.data ?? []) as LessonReferenceRow[]);
  const lessonReferenceMap = buildDbLessonReferenceMap(lessonReferenceRows);

  const authTierRaw =
    typeof user.user_metadata?.subscription_tier === "string"
      ? user.user_metadata.subscription_tier
      : typeof user.app_metadata?.subscription_tier === "string"
        ? user.app_metadata.subscription_tier
        : undefined;
  const authIsPro =
    user.user_metadata?.is_pro === true || user.app_metadata?.is_pro === true;

  const tier = normalizeSubscriptionTier(
    rawProfile?.subscription_tier ?? authTierRaw,
    rawProfile?.is_pro ?? authIsPro,
  );

  const profile: UserProfile =
    rawProfile !== null
      ? {
          id: rawProfile.id,
          full_name: rawProfile.full_name ?? user.user_metadata?.full_name ?? null,
          email: rawProfile.email ?? user.email ?? null,
          is_pro: tier === "max",
          subscription_tier: tier,
        }
      : {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? null,
          email: user.email ?? null,
          is_pro: tier === "max",
          subscription_tier: tier,
        };

  const rawLessonsWithProgress = mergeLessonsAndProgress(
    lessons,
    completionRows,
    lessonReferenceMap,
  );
  const lessonsWithProgress = rawLessonsWithProgress.filter((lesson) =>
    canAccessLessonTier(profile.subscription_tier, lesson.required_tier),
  );

  const completedCount = lessonsWithProgress.filter((item) => item.completed).length;
  const totalLessons = lessonsWithProgress.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return {
    user,
    profile,
    lessonsWithProgress,
    completedCount,
    totalLessons,
    progressPercent,
  };
};
