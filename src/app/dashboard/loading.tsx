import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function DashboardLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.45fr)_minmax(320px,360px)] md:items-start">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-14 w-14 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-12 w-3/4" />
                <SkeletonBlock className="h-5 w-full max-w-2xl" />
                <SkeletonBlock className="h-5 w-2/3 max-w-xl" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SkeletonBlock className="h-9 w-28 rounded-full" />
              <SkeletonBlock className="h-9 w-36 rounded-full" />
              <SkeletonBlock className="h-9 w-32 rounded-full" />
            </div>

            <div className="rounded-[32px] border border-[var(--line)] p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(240px,280px)]">
                <div className="space-y-4">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-10 w-4/5" />
                  <SkeletonBlock className="h-5 w-full" />
                  <SkeletonBlock className="h-5 w-3/4" />
                  <SkeletonBlock className="h-12 w-56" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <SkeletonBlock key={index} className="h-28 w-full" />
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <SkeletonBlock key={index} className="h-24 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-[var(--line)] p-4 md:p-5">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
                <SkeletonBlock className="h-28 w-full" />
                <SkeletonBlock className="h-28 w-full" />
              </div>
              <SkeletonBlock className="h-3 w-full rounded-full" />
              <SkeletonBlock className="h-5 w-2/3" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-40 w-full" />
              <SkeletonBlock className="h-14 w-full" />
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-72 w-full" />
        ))}
      </section>
    </main>
  );
}

