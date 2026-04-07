import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function LessonLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <SkeletonBlock className="h-10 w-24" />
        <SkeletonBlock className="mt-4 h-12 w-3/4" />
        <SkeletonBlock className="mt-3 h-5 w-full max-w-3xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-9 w-24 rounded-full" />
          <SkeletonBlock className="h-9 w-28 rounded-full" />
          <SkeletonBlock className="h-9 w-24 rounded-full" />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,380px)]">
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 w-full" />
          ))}
        </div>
        <div className="grid gap-4">
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </section>
    </main>
  );
}

