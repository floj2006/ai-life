import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function AdminLoading() {
  return (
    <main className="container-shell with-mobile-nav flex flex-col gap-4 py-4 md:gap-6 md:py-8">
      <section className="surface p-5 md:p-8">
        <SkeletonBlock className="h-11 w-64" />
        <SkeletonBlock className="mt-3 h-5 w-full max-w-3xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-12 w-36" />
          <SkeletonBlock className="h-12 w-32" />
        </div>
      </section>

      <section className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface p-4 md:p-6">
            <SkeletonBlock className="h-8 w-60" />
            <SkeletonBlock className="mt-3 h-4 w-48" />
            <SkeletonBlock className="mt-2 h-4 w-72" />
            <SkeletonBlock className="mt-2 h-4 w-40" />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <SkeletonBlock className="h-10 w-40" />
              <SkeletonBlock className="h-12 w-36" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

