import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPromptButton } from "@/components/dashboard/copy-prompt-button";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { isAdminEmail } from "@/lib/admin-access";
import { requireUser } from "@/lib/auth";
import {
  getPromptExplainer,
  getSyntxModelGuide,
  quickActions,
  SYNTX_AI_URL,
} from "@/lib/content";
import type { LessonCategory } from "@/lib/types";

type QuickActionPageProps = {
  params: Promise<{ action: string }>;
};

export default async function QuickActionDetailPage(props: QuickActionPageProps) {
  const { user } = await requireUser();
  const isAdmin = isAdminEmail(user.email);
  const { action } = await props.params;
  const data = quickActions.find((item) => item.slug === action);

  if (!data) {
    notFound();
  }

  const categoryByAction: Record<typeof data.slug, LessonCategory> = {
    avatar: "photo",
    video: "video",
    text: "text",
  };
  const category = categoryByAction[data.slug];
  const guide = getSyntxModelGuide(category);
  const promptExplainer = getPromptExplainer(category);

  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:py-8">
      <section className="surface fade-up p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{data.title}</h1>
        <p className="small-text mt-2">{data.subtitle}</p>
      </section>

      <section className="surface fade-up p-5 md:p-7">
        <h2 className="text-2xl font-bold">Готовый шаблон</h2>
        <p className="mt-3 rounded-2xl bg-cyan-50 p-4 text-sm leading-relaxed md:text-base">
          {data.promptTemplate}
        </p>
        <div className="mt-3">
          <CopyPromptButton prompt={data.promptTemplate} />
        </div>
      </section>

      <section className="surface fade-up p-5 md:p-7">
        <h2 className="text-2xl font-bold">Что делает промпт</h2>
        <p className="small-text mt-2">{promptExplainer.summary}</p>
        <div className="mt-3 rounded-2xl bg-cyan-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Что заменить перед запуском</p>
          <ul className="mt-2 grid gap-1 text-sm leading-relaxed">
            {promptExplainer.whatToReplace.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="surface fade-up p-5 md:p-7">
        <h2 className="text-2xl font-bold">Пошагово</h2>
        <ol className="mt-3 grid gap-2">
          {data.steps.map((step, index) => (
            <li
              key={step}
              className="rounded-2xl border border-[var(--line)] bg-white p-4 text-base"
            >
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="surface fade-up p-5 md:p-7">
        <h2 className="text-2xl font-bold">Syntx AI</h2>
        <p className="small-text mt-2">
          Рекомендуемая модель: <span className="font-semibold">{guide.primary}</span>.
        </p>
        <p className="small-text mt-1">Альтернативы: {guide.alternatives.join(", ")}.</p>
        <p className="small-text mt-1">{guide.whenToUse}</p>
        <a
          href={SYNTX_AI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="action-button primary-button mt-4 w-full"
        >
          Открыть Syntx AI
        </a>
      </section>

      <Link href="/quick-actions" className="action-button secondary-button w-full sm:w-fit">
        Назад к быстрым действиям
      </Link>

      <MobileBottomNav isAdmin={isAdmin} />
    </main>
  );
}
