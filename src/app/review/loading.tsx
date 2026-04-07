import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function ReviewLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <SkeletonBlock className="h-11 w-72" />
        <SkeletonBlock className="mt-3 h-5 w-full max-w-3xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-12 w-32" />
          <SkeletonBlock className="h-12 w-36" />
          <SkeletonBlock className="h-12 w-32" />
        </div>
      </section>

      <section className="grid gap-4">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="surface p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-8 w-40" />
                <SkeletonBlock className="h-8 w-12 rounded-full" />
              </div>
              <SkeletonBlock className="h-11 w-32" />
            </div>
            <SkeletonBlock className="mt-3 h-5 w-64" />
            <SkeletonBlock className="mt-4 h-11 w-full max-w-md" />
            <div className="mt-4 grid gap-4">
              {Array.from({ length: sectionIndex === 0 ? 2 : 1 }).map((_, rowIndex) => (
                <SkeletonBlock key={rowIndex} className="h-56 w-full" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

