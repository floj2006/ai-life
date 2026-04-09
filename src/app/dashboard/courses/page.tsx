import Link from "next/link";
import { redirect } from "next/navigation";
import { HourlyLessonShowcase } from "@/components/dashboard/hourly-lesson-showcase";
import { LessonCatalog } from "@/components/dashboard/lesson-catalog";
import { CoursesWorkspace } from "@/components/dashboard/courses-workspace";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { isAdminEmail } from "@/lib/admin-access";
import { getDashboardData } from "@/lib/dashboard-data";
import { decryptRecordFields } from "@/lib/security/encryption";
import { isSubmissionStatus } from "@/lib/submissions";
import { getTierLabel } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubmissionStatus } from "@/lib/types";

type SubmissionRow = {
  id: string;
  lesson_id: string;
  status: string;
  student_comment: string;
  result_link: string | null;
  updated_at: string;
};

export default async function DashboardCoursesPage() {
  const { user, profile, lessonsWithProgress } = await getDashboardData();
  const isAdmin = isAdminEmail(profile.email);

  if (isAdmin) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: submissionsData } = await admin
    .from("lesson_submissions")
    .select("id, lesson_id, status, student_comment, result_link, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(12);

  const submissions = ((submissionsData ?? []) as SubmissionRow[])
    .map((item) =>
      decryptRecordFields(item as Record<string, unknown>, ["student_comment", "result_link"]),
    )
    .filter((item) => isSubmissionStatus(item.status))
    .map((item) => ({
      ...item,
      status: item.status as SubmissionStatus,
      student_comment: item.student_comment ?? "",
    }));

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface surface-glow fade-up p-5 md:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Каталог уроков</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight md:text-4xl">Курсы вашего уровня</h1>
            <p className="small-text mt-2">
              Ваш тариф: <span className="font-semibold">{getTierLabel(profile.subscription_tier)}</span>
            </p>
          </div>
          <Link href="/dashboard" className="action-button secondary-button w-full sm:w-fit">
            В кабинет
          </Link>
        </div>
      </section>

      <CoursesWorkspace lessons={lessonsWithProgress} submissions={submissions} />
      <HourlyLessonShowcase lessons={lessonsWithProgress} />
      <LessonCatalog lessons={lessonsWithProgress} currentTier={profile.subscription_tier} />
      <MobileBottomNav isAdmin={false} />
    </main>
  );
}
