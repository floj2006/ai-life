import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function SuccessPage() {
  await requireUser();

  return (
    <main className="container-shell flex flex-col gap-4 py-4 md:py-8">
      <section className="surface fade-up p-5 md:p-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Заявка на оплату принята
        </h1>
        <p className="small-text mt-2">
          После проверки оплаты доступ к тарифу активируется вручную.
        </p>
      </section>

      <section className="surface fade-up p-5 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard/courses" className="action-button primary-button">
            К урокам
          </Link>
          <Link href="/billing" className="action-button secondary-button">
            Проверить тариф
          </Link>
        </div>
      </section>
    </main>
  );
}
