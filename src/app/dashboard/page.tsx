import Image from "next/image";
import Link from "next/link";
import { LessonCategoryChip } from "@/components/dashboard/lesson-category-chip";
import { LessonCatalog } from "@/components/dashboard/lesson-catalog";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { StartProButton } from "@/components/dashboard/start-pro-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { isAdminEmail } from "@/lib/admin-access";
import { getDashboardData } from "@/lib/dashboard-data";
import { paidPlanById, type PaidPlanId } from "@/lib/pricing";
import { getTierLabel } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORY_META = {
  photo: {
    label: "Фото",
    blurb: "портреты, карточки, визуал",
  },
  video: {
    label: "Видео",
    blurb: "ролики, хук, монтаж",
  },
  text: {
    label: "Тексты",
    blurb: "посты, письма, CTA",
  },
  business: {
    label: "Бизнес",
    blurb: "офферы, воронки, продажи",
  },
} as const;

const WORKFLOW_STEPS = [
  {
    title: "Откройте урок",
    description: "Начните с ближайшего урока или нужной категории.",
  },
  {
    title: "Сделайте результат",
    description: "Повторите шаги урока и выполните задачу в Syntx AI.",
  },
  {
    title: "Отправьте на проверку",
    description: "Загрузите файл и дождитесь ответа проверяющего.",
  },
];

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
      title: "Откройте Start",
      description: "Start откроет следующий блок уроков и даст больше практики внутри платформы.",
    };
  }

  return {
    eyebrow: "Следующий тариф",
    title: "Откройте Max",
    description: "Max откроет все продвинутые уроки и приоритетную проверку ваших работ.",
  };
};

type DashboardPageProps = {
  searchParams: Promise<{ section?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const { profile, lessonsWithProgress, completedCount, totalLessons, progressPercent } =
    await getDashboardData();

  const isAdmin = isAdminEmail(profile.email);
  const focusCourses = !isAdmin && params.section === "courses";
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

  const categoryCounts = lessonsWithProgress.reduce<Record<keyof typeof CATEGORY_META, number>>(
    (acc, lesson) => {
      acc[lesson.category] += 1;
      return acc;
    },
    {
      photo: 0,
      video: 0,
      text: 0,
      business: 0,
    },
  );

  const categoryStats = isAdmin
    ? []
    : Object.entries(CATEGORY_META)
        .map(([key, meta]) => ({
          key,
          label: meta.label,
          blurb: meta.blurb,
          count: categoryCounts[key as keyof typeof CATEGORY_META],
        }))
        .filter((item) => item.count > 0);

  let pendingReviewCount = 0;

  if (isAdmin) {
    try {
      const admin = createAdminClient();
      const { count } = await admin
        .from("lesson_submissions")
        .select("id", { count: "exact", head: true })
        .in("status", ["sent", "in_review", "needs_revision"]);

      pendingReviewCount = count ?? 0;
    } catch {
      pendingReviewCount = 0;
    }
  }

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      {focusCourses ? (
        <LessonCatalog lessons={lessonsWithProgress} currentTier={profile.subscription_tier} />
      ) : null}
      <section className="surface surface-glow fade-up overflow-hidden p-5 md:p-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(320px,360px)] md:items-start">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="avatar-orbit shrink-0">
                <Image
                  src="/brand/ai-easy-life-avatar.png"
                  alt="Аватар AI Easy Life"
                  width={56}
                  height={56}
                  className="rounded-2xl border border-sky-200 bg-white p-1"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
                  Личный кабинет
                </p>
                <h1 className="text-3xl font-bold leading-tight md:text-5xl">
                  Привет, {profile.full_name || "друг"}!
                </h1>
                <p className="small-text mt-3 max-w-2xl text-base leading-relaxed md:text-lg">
                  {isAdmin
                    ? "Здесь вы управляете тарифами, проверяете задания и держите переписку с учениками под рукой."
                    : "Здесь понятно, какой урок открыть следующим, что у вас уже доступно и куда отправлять результат."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-900 ring-1 ring-sky-200">
                Тариф: {getTierLabel(profile.subscription_tier)}
              </span>
              {isAdmin ? (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800">
                  Роль: администратор
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800">
                  Открыто уроков: {totalLessons}
                </span>
              )}
              {!isAdmin ? (
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-900 ring-1 ring-cyan-100">
                  Пройдено: {completedCount}/{totalLessons}
                </span>
              ) : null}
            </div>

            {!isAdmin ? (
              <div className="mt-6 grid gap-4">
                <section className="section-spark rounded-[32px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(231,247,255,0.88))] p-6 shadow-[0_18px_44px_rgba(10,61,98,0.08)] md:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                    Сейчас лучше всего пройти
                  </p>
                  <h2 className="mt-3 max-w-[620px] text-2xl font-bold leading-[1.08] text-[var(--ink)] md:text-3xl xl:text-[40px]">
                    {nextLesson ? nextLesson.title : "Все уроки вашего уровня уже закрыты"}
                  </h2>

                  {nextLesson ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <LessonCategoryChip category={nextLesson.category} />
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700">
                        {nextLesson.duration_minutes} мин
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-800 ring-1 ring-sky-100">
                        Уровень урока: {getTierLabel(nextLesson.required_tier)}
                      </span>
                    </div>
                  ) : null}

                  <p className="small-text mt-4 max-w-2xl text-sm leading-relaxed md:text-base">
                    {nextLesson
                      ? "Откройте урок, повторите шаги и сразу отправьте готовый результат на проверку."
                      : "Можно перейти к заданиям, посмотреть ответы проверяющего и открыть следующий тариф."}
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                    {nextLesson ? (
                      <Link
                        href={`/dashboard/lessons/${nextLesson.id}`}
                        className="action-button primary-button w-full sm:w-auto sm:min-w-[220px]"
                      >
                        Открыть урок
                      </Link>
                    ) : (
                      <Link
                        href="/submissions"
                        className="action-button primary-button w-full sm:w-auto sm:min-w-[220px]"
                      >
                        Открыть мои задания
                      </Link>
                    )}
                    <Link
                      href="/dashboard?section=courses"
                      className="action-button secondary-button w-full sm:w-auto sm:min-w-[220px]"
                    >
                      Выбрать любой урок
                    </Link>
                  </div>
                  <p className="small-text mt-2">
                    Можно открыть любой урок ниже в разделе «Курсы», порядок не заблокирован.
                  </p>
                </section>

                <section className="hidden gap-4 md:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
                  <div className="section-spark rounded-[28px] border border-[var(--line)] bg-white/72 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                      Как всё проходит
                    </p>
                    <div className="mt-4 grid gap-3">
                      {WORKFLOW_STEPS.map((step, index) => (
                        <div
                          key={step.title}
                          className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">{step.title}</p>
                            <p className="small-text mt-1">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="section-spark rounded-[28px] border border-[var(--line)] bg-white/72 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                      Что доступно на вашем тарифе
                    </p>
                    <p className="small-text mt-2">
                      Сейчас у вас открыт уровень <span className="font-semibold">{getTierLabel(profile.subscription_tier)}</span>.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {categoryStats.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--ink)]">{item.label}</p>
                              <p className="small-text mt-1">{item.blurb}</p>
                            </div>
                            <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-sky-800 ring-1 ring-sky-100">
                              {item.count}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </div>

          <aside className="section-spark rounded-[28px] border border-[var(--line)] bg-white/82 p-4 shadow-[0_20px_45px_rgba(8,47,73,0.08)] backdrop-blur md:p-5">
            {isAdmin ? (
              <div className="grid gap-4">
                <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                    Очередь проверки
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[var(--ink)]">{pendingReviewCount}</p>
                  <p className="small-text mt-1">заданий ждут вашего решения</p>
                </div>

                <div className="grid gap-2">
                  <Link href="/admin" className="action-button primary-button action-button-with-icon">
                    <Image
                      src="/icons/icon-admin.png"
                      alt=""
                      width={24}
                      height={24}
                      className="action-button-icon"
                      aria-hidden
                    />
                    <span>Открыть админ-панель</span>
                  </Link>
                  <Link href="/review" className="action-button secondary-button w-full">
                    Проверка заданий
                  </Link>
                  <LogoutButton />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
                  <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                      Открыто уроков
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[var(--ink)]">{totalLessons}</p>
                    <p className="small-text mt-1">на вашем тарифе</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                      Готово
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[var(--ink)]">{progressPercent}%</p>
                    <p className="small-text mt-1">уроков уже принято</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-cyan-100">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="small-text">{progressPercent}% уроков вашего уровня уже закрыто</p>
                </div>

                <div className="grid gap-2">
                  <Link href="/submissions" className="action-button secondary-button action-button-with-icon">
                    <Image
                      src="/icons/icon-submissions.png"
                      alt=""
                      width={24}
                      height={24}
                      className="action-button-icon"
                      aria-hidden
                    />
                    <span>Мои задания</span>
                  </Link>

                  {upgradePlan && upgradeCopy ? (
                    <div className="rounded-2xl bg-[rgba(188,234,255,0.32)] p-3 ring-1 ring-sky-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                          {upgradeCopy.eyebrow}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[var(--ink)] ring-1 ring-sky-100">
                          {upgradePlan.priceLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{upgradeCopy.title}</p>
                      <p className="small-text mt-1">{upgradeCopy.description}</p>
                      <div className="mt-3 grid gap-1">
                        {upgradePlan.features.slice(0, 2).map((feature) => (
                          <p key={feature} className="small-text text-[var(--ink)]">
                            - {feature}
                          </p>
                        ))}
                      </div>
                      <div className="mt-3">
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
        <section className="surface fade-up p-5 md:p-7">
          <h2 className="text-2xl font-bold">Режим администратора</h2>
          <p className="small-text mt-2">
            В админ-панели доступны управление тарифами, проверка работ и переписка с учениками.
          </p>
        </section>
       ) : !focusCourses ? (
        <LessonCatalog lessons={lessonsWithProgress} currentTier={profile.subscription_tier} />
      ) : null}

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}




