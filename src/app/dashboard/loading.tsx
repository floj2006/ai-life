import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function DashboardLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-5 py-4 md:gap-7 md:py-9">
      <section className="surface p-5 md:p-10">
        <div className="grid gap-7 md:grid-cols-[minmax(0,1.45fr)_minmax(320px,360px)] md:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-14 w-3/4" />
              <SkeletonBlock className="h-5 w-full max-w-2xl" />
              <SkeletonBlock className="h-5 w-2/3 max-w-xl" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <SkeletonBlock className="h-9 w-28 rounded-2xl" />
              <SkeletonBlock className="h-9 w-36 rounded-2xl" />
              <SkeletonBlock className="h-9 w-32 rounded-2xl" />
            </div>

            <div className="rounded-[30px] border border-[var(--line)] p-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.06fr)_minmax(300px,0.94fr)]">
                <div className="space-y-4">
                  <SkeletonBlock className="h-12 w-5/6" />
                  <div className="flex gap-2">
                    <SkeletonBlock className="h-8 w-20 rounded-full" />
                    <SkeletonBlock className="h-8 w-20 rounded-full" />
                    <SkeletonBlock className="h-8 w-36 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-5 w-full" />
                  <SkeletonBlock className="h-5 w-3/4" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SkeletonBlock className="h-14 w-full" />
                    <SkeletonBlock className="h-14 w-full" />
                  </div>
                </div>

                <div className="grid gap-3">
                  <SkeletonBlock className="h-28 w-full" />
                  <SkeletonBlock className="h-28 w-full" />
                  <SkeletonBlock className="h-28 w-full" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SkeletonBlock className="h-28 w-full" />
                <SkeletonBlock className="h-28 w-full" />
                <SkeletonBlock className="h-28 w-full" />
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-[var(--line)] p-4 md:p-5">
            <div className="grid gap-4">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-3 w-full rounded-full" />
              <SkeletonBlock className="h-5 w-2/3" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
