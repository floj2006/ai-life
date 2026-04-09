import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function SubmissionsLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-4 w-40 rounded-full" />
          <SkeletonBlock className="h-11 w-52" />
          <SkeletonBlock className="h-5 w-full max-w-2xl" />
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-32 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="overflow-hidden rounded-2xl border border-sky-100 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] md:p-6">
            <div className="grid gap-4 md:grid-cols-[116px_minmax(0,1fr)_auto] md:items-center">
              <SkeletonBlock className="aspect-[4/3] w-full max-w-[116px] rounded-2xl" />
              <div className="space-y-3">
                <SkeletonBlock className="h-8 w-2/3" />
                <div className="flex flex-wrap gap-2">
                  <SkeletonBlock className="h-7 w-40 rounded-full" />
                  <SkeletonBlock className="h-7 w-44 rounded-full" />
                  <SkeletonBlock className="h-7 w-32 rounded-full" />
                </div>
                <SkeletonBlock className="h-20 w-full rounded-2xl" />
              </div>
              <div className="grid gap-2 md:min-w-[176px]">
                <SkeletonBlock className="h-11 w-full rounded-xl" />
                <SkeletonBlock className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
