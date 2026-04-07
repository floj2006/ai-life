import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function BillingLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:py-8">
      <section className="surface p-5 md:p-8">
        <SkeletonBlock className="h-11 w-64" />
        <SkeletonBlock className="mt-3 h-5 w-full max-w-3xl" />
      </section>

      <section className="surface p-5 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[var(--line)] p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <SkeletonBlock className="h-8 w-28" />
                  <SkeletonBlock className="h-4 w-36" />
                </div>
                <SkeletonBlock className="h-8 w-20" />
              </div>
              <div className="mt-4 grid gap-2">
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <SkeletonBlock key={rowIndex} className="h-4 w-full" />
                ))}
              </div>
              <SkeletonBlock className="mt-4 h-40 w-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

