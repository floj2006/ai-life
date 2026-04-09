import { ReviewBoard } from "@/components/review/review-board";
import { getAdminReviewData } from "@/lib/admin-panel-data";

export default async function AdminReviewPage() {
  const { warnings, items } = await getAdminReviewData();

  return (
    <div className="grid gap-4">
      {warnings.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Предупреждения</p>
          <ul className="mt-2 grid gap-1">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReviewBoard items={items} />
    </div>
  );
}

