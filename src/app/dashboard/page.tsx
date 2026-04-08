import Link from "next/link";
import { redirect } from "next/navigation";
import { LessonCategoryChip } from "@/components/dashboard/lesson-category-chip";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { StartProButton } from "@/components/dashboard/start-pro-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { isAdminEmail } from "@/lib/admin-access";
import { getDashboardData } from "@/lib/dashboard-data";
import { paidPlanById, type PaidPlanId } from "@/lib/pricing";
import { getTierLabel } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionMetrics = {
  active: number;
  approved: number;
  total: number;
};

const getUpgradePlanId = (tier: "newbie" | "start" | "max") => {
  if (tier === "newbie") {
    return "start" satisfies PaidPlanId;
  }

  if (tier === "start") {
    return "max" satisfies PaidPlanId;
  }

  return null;
};

const getUpgradeCopy = (planId: PaidPlanId) => {
  if (planId === "start") {
    return {
      eyebrow: "Следующий тариф",
      title: "Откройте Старт",
      description: "Тариф «Старт» откроет больше уроков и больше практики внутри платформы.",
    };
  }

  return {
    eyebrow: "Следующий тариф",
    title: "Откройте Макс",
    description: "Тариф «Макс» откроет продвинутые уроки и приоритетную проверку ваших работ.",
  };
};

export default async function DashboardPage() {
  const { user, profile, lessonsWithProgress, completedCount, totalLessons, progressPercent } =
    await getDashboardData();

  const isAdmin = isAdminEmail(profile.email);
  if (isAdmin) {
    redirect("/admin");
  }
  const nextLesson = !isAdmin
    ? lessonsWithProgress.find(
        (lesson) => !lesson.completed && lesson.required_tier === profile.subscription_tier,
      ) ??
      lessonsWithProgress.find((lesson) => !lesson.completed) ??
      lessonsWithProgress[0] ??
      null
    : null;

  const upgradePlanId = !isAdmin ? getUpgradePlanId(profile.subscription_tier) : null;
  const upgradePlan = upgradePlanId ? paidPlanById[upgradePlanId] : null;
  const upgradeCopy = upgradePlanId ? getUpgradeCopy(upgradePlanId) : null;

  let pendingReviewCount = 0;
  let submissionMetrics: SubmissionMetrics = {
    active: 0,
    approved: completedCount,
    total: 0,
  };

  const admin = createAdminClient();

  if (isAdmin) {
    try {
      const { count, error } = await admin
        .from("lesson_submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["sent", "in_review", "needs_revision"]);

      if (!error) {
        pendingReviewCount = count ?? 0;
      }
    } catch {
      pendingReviewCount = 0;
    }
  } else {
    try {
      const [activeResult, approvedResult, totalResult] = await Promise.all([
        admin
          .from("lesson_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["sent", "in_review", "needs_revision"]),
        admin
          .from("lesson_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved"),
        admin
          .from("lesson_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      submissionMetrics = {
        active: activeResult.error ? 0 : activeResult.count ?? 0,
        approved: approvedResult.error ? completedCount : approvedResult.count ?? completedCount,
        total: totalResult.error ? 0 : totalResult.count ?? 0,
      };
    } catch {
      submissionMetrics = {
        active: 0,
        approved: completedCount,
        total: 0,
      };
    }
  }

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-5 py-4 md:gap-7 md:py-9">
      <section className="surface surface-glow fade-up overflow-hidden p-5 md:p-10">
        <div className="grid gap-7 md:grid-cols-[minmax(0,1.45fr)_minmax(320px,360px)] md:items-start">
          <div className="min-w-0 space-y-6">
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-700">
                Личный кабинет
              </p>
              <h1 className="text-[42px] font-bold leading-[0.95] text-[var(--ink)] md:text-[64px]">
                Привет, {profile.full_name || "друг"}!
              </h1>
              <p className="small-text max-w-2xl text-[16px] leading-relaxed md:text-[18px]">
                {isAdmin
                  ? "Здесь вы управляете тарифами, проверяете задания и держите переписку с учениками под рукой."
                  : "Это единый кабинет: отсюда вы открываете каталог уроков, отправляете задания и следите за прогрессом."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-2xl border border-sky-200 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-sky-900">
                Тариф: {getTierLabel(profile.subscription_tier)}
              </span>
              {isAdmin ? (
                <span className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-sm font-semibold text-zinc-800">
                  Роль: администратор
                </span>
              ) : (
                <span className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-sm font-semibold text-zinc-800">
                  Открыто уроков: {totalLessons}
                </span>
              )}
              {!isAdmin ? (
                <span className="rounded-2xl border border-cyan-200 bg-cyan-50/90 px-3.5 py-1.5 text-sm font-semibold text-cyan-900">
                  Пройдено: {completedCount}/{totalLessons}
                </span>
              ) : null}
            </div>

            {!isAdmin ? (
              <section className="section-spark rounded-[30px] border border-sky-100 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(235,248,255,0.78))] p-6 shadow-[0_20px_50px_rgba(10,61,98,0.09)] md:p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                  Кабинет ученика
                </p>

                <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.06fr)_minmax(300px,0.94fr)]">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold leading-[1.04] text-[var(--ink)] md:text-4xl">
                      {nextLesson ? nextLesson.title : "Программа текущего уровня пройдена"}
                    </h2>

                    {nextLesson ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <LessonCategoryChip category={nextLesson.category} />
                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700">
                          {nextLesson.duration_minutes} мин
                        </span>
                        <span className="rounded-full border border-sky-100 bg-white px-3 py-1 text-sm font-semibold text-sky-800">
                          Уровень урока: {getTierLabel(nextLesson.required_tier)}
                        </span>
                      </div>
                    ) : null}

                    <p className="small-text max-w-2xl text-[15px] leading-relaxed md:text-base">
                      {nextLesson
                        ? "Откройте урок, выполните задание в Syntx AI и отправьте результат на проверку."
                        : "Откройте каталог уроков или задания, чтобы продолжить работу в кабинете."}
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {nextLesson ? (
                        <Link
                          href={`/dashboard/lessons/${nextLesson.id}`}
                          className="action-button primary-button w-full sm:w-auto sm:min-w-[220px]"
                        >
                          Открыть урок
                        </Link>
                      ) : (
                        <Link
                          href="/dashboard/courses"
                          className="action-button primary-button w-full sm:w-auto sm:min-w-[220px]"
                        >
                          Открыть каталог
                        </Link>
                      )}
                      <Link
                        href="/submissions?tab=active"
                        className="action-button secondary-button w-full sm:w-auto sm:min-w-[220px]"
                      >
                        Мои задания
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Link
                      href="/dashboard/courses"
                      className="lift-card rounded-2xl border border-sky-100 bg-white/90 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-[var(--ink)]">Каталог уроков</p>
                        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                          Открыть
                        </span>
                      </div>
                      <p className="small-text mt-2 text-sm">Отдельная страница со всеми доступными уроками.</p>
                    </Link>

                    <Link
                      href="/submissions?tab=active"
                      className="lift-card rounded-2xl border border-sky-100 bg-white/90 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-[var(--ink)]">Проверка заданий</p>
                        <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800">
                          {submissionMetrics.active} активных
                        </span>
                      </div>
                      <p className="small-text mt-2 text-sm">Смотреть статусы, сообщения и ответы проверяющего.</p>
                    </Link>

                    <Link
                      href="/billing"
                      className="lift-card rounded-2xl border border-sky-100 bg-white/90 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold text-[var(--ink)]">Тариф и оплата</p>
                        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                          Открыть
                        </span>
                      </div>
                      <p className="small-text mt-2 text-sm">Реквизиты, текущий тариф и переход на следующий уровень.</p>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl border border-sky-100 bg-white/92 p-4 shadow-[0_8px_20px_rgba(8,47,73,0.04)]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">В работе</p>
                    <p className="mt-2 text-4xl font-bold leading-none text-[var(--ink)]">{submissionMetrics.active}</p>
                    <p className="small-text mt-2">заданий ждут проверки</p>
                  </article>

                  <article className="rounded-2xl border border-cyan-100 bg-white/92 p-4 shadow-[0_8px_20px_rgba(8,47,73,0.04)]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Принято</p>
                    <p className="mt-2 text-4xl font-bold leading-none text-[var(--ink)]">{submissionMetrics.approved}</p>
                    <p className="small-text mt-2">успешно проверенных работ</p>
                  </article>

                  <article className="rounded-2xl border border-sky-100 bg-white/92 p-4 shadow-[0_8px_20px_rgba(8,47,73,0.04)]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Всего отправок</p>
                    <p className="mt-2 text-4xl font-bold leading-none text-[var(--ink)]">{submissionMetrics.total}</p>
                    <p className="small-text mt-2">по всем урокам</p>
                  </article>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="section-spark rounded-[28px] border border-sky-100 bg-white/86 p-4 shadow-[0_18px_45px_rgba(8,47,73,0.08)] backdrop-blur md:p-5">
            {isAdmin ? (
              <div className="grid gap-4">
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Очередь проверки</p>
                  <p className="mt-2 text-4xl font-bold leading-none text-[var(--ink)]">{pendingReviewCount}</p>
                  <p className="small-text mt-2">заданий ждут вашего решения</p>
                </div>

                <div className="grid gap-2.5">
                  <Link href="/admin" className="action-button primary-button w-full">
                    Открыть админ-панель
                  </Link>
                  <Link href="/review" className="action-button secondary-button w-full">
                    Проверка заданий
                  </Link>
                  <LogoutButton />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/95 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Открыто уроков</p>
                    <p className="mt-2 text-4xl font-bold leading-none text-[var(--ink)]">{totalLessons}</p>
                    <p className="small-text mt-2">на вашем тарифе</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/95 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Прогресс</p>
                    <p className="mt-2 text-4xl font-bold leading-none text-[var(--ink)]">{progressPercent}%</p>
                    <p className="small-text mt-2">программы уже принято</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-cyan-100">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="small-text">{progressPercent}% уроков вашего уровня уже закрыто</p>
                </div>

                <div className="grid gap-2.5">
                  <Link href="/dashboard/courses" className="action-button secondary-button w-full">
                    Каталог уроков
                  </Link>
                  <Link href="/submissions?tab=active" className="action-button secondary-button w-full">
                    Мои задания
                  </Link>
                  <Link href="/billing" className="action-button secondary-button w-full">
                    Тариф и оплата
                  </Link>

                  {upgradePlan && upgradeCopy ? (
                    <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(145deg,rgba(188,234,255,0.38),rgba(255,255,255,0.84))] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                          {upgradeCopy.eyebrow}
                        </p>
                        <span className="rounded-full border border-sky-100 bg-white px-3 py-1 text-sm font-semibold text-[var(--ink)]">
                          {upgradePlan.priceLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{upgradeCopy.title}</p>
                      <p className="small-text mt-1.5">{upgradeCopy.description}</p>
                      <div className="mt-3 grid gap-1.5">
                        {upgradePlan.features.slice(0, 2).map((feature) => (
                          <p key={feature} className="small-text text-[var(--ink)]">
                            - {feature}
                          </p>
                        ))}
                      </div>
                      <div className="mt-3.5">
                        <StartProButton
                          plan={upgradePlan.id}
                          buttonLabel={`Открыть реквизиты ${upgradePlan.title}`}
                        />
                      </div>
                    </div>
                  ) : null}

                  <LogoutButton />
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {isAdmin ? (
        <section className="surface fade-up p-6 md:p-8">
          <h2 className="text-[30px] font-bold leading-tight text-[var(--ink)]">Режим администратора</h2>
          <p className="small-text mt-2 max-w-2xl text-base">
            В админ-панели доступны управление тарифами, проверка работ и переписка с учениками.
          </p>
        </section>
      ) : null}

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}


