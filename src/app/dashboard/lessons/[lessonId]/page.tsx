import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPromptButton } from "@/components/dashboard/copy-prompt-button";
import { LessonCategoryChip } from "@/components/dashboard/lesson-category-chip";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { SubmissionCreateForm } from "@/components/submissions/submission-create-form";
import { TrackEventOnMount } from "@/components/telemetry/track-event-on-mount";
import { isAdminEmail } from "@/lib/admin-access";
import {
  getHomeworkChecklist,
  getHomeworkCommonMistakes,
  getPromptExplainer,
  getSyntxModelGuide,
} from "@/lib/content";
import { getDashboardData } from "@/lib/dashboard-data";
import { getTierLabel } from "@/lib/subscription";

type LessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

const tierBadgeClass = (tier: "newbie" | "start" | "max") => {
  if (tier === "max") {
    return "bg-amber-100 text-amber-800";
  }

  if (tier === "start") {
    return "bg-slate-100 text-slate-800";
  }

  return "bg-cyan-100 text-cyan-800";
};

const MAX_PROMPT_PREVIEW = 280;

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const { profile, lessonsWithProgress } = await getDashboardData();

  const lesson = lessonsWithProgress.find(
    (item) => item.id === lessonId || item.slug === lessonId,
  );
  if (!lesson) {
    notFound();
  }

  const modelGuide = getSyntxModelGuide(lesson.category);
  const promptExplainer = getPromptExplainer(lesson.category);
  const homeworkChecklist = getHomeworkChecklist(lesson.category);
  const homeworkMistakes = getHomeworkCommonMistakes(lesson.category);
  const primaryToolUrl = lesson.ai_tool_url;
  const isAdmin = isAdminEmail(profile.email);
  const hasLongPrompt = lesson.prompt_template.length > MAX_PROMPT_PREVIEW;
  const promptPreview = hasLongPrompt
    ? `${lesson.prompt_template.slice(0, MAX_PROMPT_PREVIEW).trimEnd()}...`
    : lesson.prompt_template;

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <TrackEventOnMount
        eventName="lesson_view"
        payload={{
          lessonId: lesson.id,
          lessonSlug: lesson.slug,
          category: lesson.category,
          requiredTier: lesson.required_tier,
        }}
      />
      <section className="surface surface-glow fade-up overflow-hidden p-4 md:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard#course-catalog"
              className="action-button secondary-button w-full sm:w-fit"
            >
              К списку уроков
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <LessonCategoryChip category={lesson.category} />
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${tierBadgeClass(lesson.required_tier)}`}
              >
                Уровень {getTierLabel(lesson.required_tier)}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                {lesson.duration_minutes} мин
              </span>
              {lesson.completed ? (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase text-sky-800">
                  Пройдено
                </span>
              ) : null}
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">{lesson.title}</h1>
            <p className="small-text mt-3 text-base leading-relaxed">{lesson.short_description}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-cyan-50/80 px-4 py-3 ring-1 ring-cyan-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                Что делаем
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{lesson.goal}</p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-[var(--line)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                Что сдаем
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{lesson.expected_result}</p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-[var(--line)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                Ваш тариф
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                {getTierLabel(profile.subscription_tier)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="surface section-spark fade-up p-4 md:p-6"
        style={{ animationDelay: "0.04s" }}
      >
        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-[28px] bg-cyan-50/80 p-4 ring-1 ring-cyan-100 md:p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
              Что сделать
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink)] md:text-base">
              {lesson.goal}
            </p>

            <div className="mt-4 grid gap-2.5">
              {lesson.steps.slice(0, 4).map((step, index) => (
                <div
                  key={`${lesson.id}-${index}`}
                  className="flex items-start gap-3 rounded-2xl bg-white/92 px-4 py-3 ring-1 ring-white/70"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-[var(--ink)]">{step}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--line)] bg-white/90 p-4 md:p-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Что отправить
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
                {lesson.expected_result}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Критерии проверки
              </p>
              <ul className="mt-3 grid gap-2 text-sm leading-relaxed">
                {homeworkChecklist.map((item) => (
                  <li key={item} className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                Частые ошибки
              </p>
              <ul className="mt-3 grid gap-2 text-sm leading-relaxed">
                {homeworkMistakes.map((item) => (
                  <li key={item} className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section
        className="surface section-spark fade-up p-4 md:p-6"
        style={{ animationDelay: "0.08s" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Промпт</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight">Рабочий сценарий для Syntx AI</h2>
            <p className="small-text mt-2 max-w-2xl">
              Для этого урока лучше начать с модели <span className="font-semibold">{modelGuide.primary}</span>.
              {" "}Альтернативы: {modelGuide.alternatives.join(", ")}.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-800 ring-1 ring-sky-100">
            {modelGuide.primary}
          </span>
        </div>

        <div className="mt-4 rounded-[28px] bg-cyan-50/80 p-4 ring-1 ring-cyan-100">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
            Короткая версия
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
            {promptPreview}
          </p>
        </div>

        {hasLongPrompt ? (
          <details className="mt-3 rounded-[24px] border border-[var(--line)] bg-white/90 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
              Показать полный промпт
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
              {lesson.prompt_template}
            </p>
          </details>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CopyPromptButton prompt={lesson.prompt_template} />
          <a
            href={primaryToolUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button primary-button w-full"
          >
            Открыть Syntx AI
          </a>
        </div>

        <div className="mt-4 rounded-[28px] border border-[var(--line)] bg-white/90 p-4 md:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
            Разбор промпта
          </p>

          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              Что делает промпт
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">
              {promptExplainer.summary}
            </p>
          </div>

          <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              Что заменить под себя
            </p>
            <ul className="mt-2 grid gap-2 text-sm leading-relaxed text-[var(--ink)]">
              {promptExplainer.whatToReplace.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          <details className="mt-3 rounded-[24px] border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
              Раскрыть подробный разбор
            </summary>

            <div className="mt-3 rounded-2xl bg-cyan-50 px-4 py-4 ring-1 ring-cyan-100">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                Почему работает
              </p>
              <ul className="mt-2 grid gap-2 text-sm leading-relaxed text-[var(--ink)]">
                {promptExplainer.whyItWorks.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </details>
        </div>

        <p className="small-text mt-3">{modelGuide.whenToUse}</p>
      </section>

      <section
        className="surface surface-glow fade-up p-4 md:p-6"
        style={{ animationDelay: "0.12s" }}
      >
        <div className="mb-4 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
            Отправка на проверку
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight">Загрузите результат прямо в уроке</h2>
          <p className="small-text mt-2">
            После отправки работа появится в разделе «Мои задания», а проверяющий сможет сразу
            оставить статус и комментарий.
          </p>
        </div>
        <SubmissionCreateForm lessonId={lesson.id} />
      </section>

      {isAdmin ? (
        <section
          className="surface fade-up p-4 md:p-6"
          style={{ animationDelay: "0.16s" }}
        >
          <p className="small-text">
            Вы открыли урок в режиме администратора. Отправка задания доступна как у обычного ученика,
            но статус и проверка работ управляются из админских разделов.
          </p>
        </section>
      ) : null}

      <section
        className="surface fade-up p-4 md:hidden"
        style={{ animationDelay: "0.18s" }}
      >
        <Link href="/dashboard#course-catalog" className="action-button secondary-button w-full">
          Вернуться к курсам
        </Link>
      </section>

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}
