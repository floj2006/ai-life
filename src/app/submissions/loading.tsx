import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function SubmissionsLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-11 w-64" />
          <SkeletonBlock className="h-5 w-full max-w-2xl" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center">
              <SkeletonBlock className="aspect-[4/3] w-full max-w-[112px]" />
              <div className="space-y-3">
                <SkeletonBlock className="h-8 w-2/3" />
                <div className="flex flex-wrap gap-2">
                  <SkeletonBlock className="h-8 w-24 rounded-full" />
                  <SkeletonBlock className="h-8 w-36 rounded-full" />
                  <SkeletonBlock className="h-8 w-28 rounded-full" />
                </div>
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
              </div>
              <div className="grid gap-2 md:min-w-[170px]">
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

