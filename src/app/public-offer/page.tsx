import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  LEGAL_BRAND_NAME,
  LEGAL_COMMON_NOTE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_TELEGRAM,
  LEGAL_PROVIDER_NAME,
  ROBOKASSA_PARTNER_OFFER_URL,
  ROBOKASSA_PRIVACY_POLICY_URL,
} from "@/lib/legal";
import { plans } from "@/lib/pricing";

export const metadata: Metadata = {
  title: `Публичная оферта | ${LEGAL_BRAND_NAME}`,
  description: "Публичная оферта на предоставление доступа к платформе AI Easy Life.",
};

const sections = [
  {
    id: "subject",
    title: "Предмет оферты",
    items: [
      `${LEGAL_PROVIDER_NAME} предоставляет пользователю доступ к платформе ${LEGAL_BRAND_NAME}, включая уроки, личный кабинет, отправку заданий, проверку и иные цифровые материалы согласно выбранному тарифу.`,
      LEGAL_COMMON_NOTE,
      "Оферта регулирует отношения по предоставлению цифрового обучающего продукта и сопутствующих сервисов внутри платформы.",
    ],
  },
  {
    id: "accept",
    title: "Акцепт оферты",
    items: [
      "Акцептом считается регистрация на сайте, оплата тарифа, отправка подтверждения оплаты либо фактическое использование платформы после получения доступа.",
      "С момента акцепта пользователь подтверждает, что ознакомился с условиями оферты и политики конфиденциальности и принимает их полностью.",
    ],
  },
  {
    id: "plans",
    title: "Тарифы и доступ",
    items: [
      "Newbie — ознакомительный уровень с ограниченным набором уроков.",
      "Start — платный доступ к урокам уровней Newbie и Start.",
      "Max — платный доступ ко всей программе, включая продвинутые уроки и расширенный формат проверки.",
    ],
  },
  {
    id: "payment",
    title: "Порядок оплаты",
    items: [
      "На момент публикации доступ может оплачиваться по реквизитам, указанным на странице оплаты, с последующей ручной активацией тарифа после подтверждения платежа.",
      "В дальнейшем платформа может подключать онлайн-эквайринг и платежные сервисы, включая Robokassa, если такой способ оплаты будет доступен на сайте.",
      "При оплате через подключенный платежный сервис дополнительно применяются правила соответствующего провайдера.",
    ],
  },
  {
    id: "access",
    title: "Предоставление доступа",
    items: [
      "Доступ к платному тарифу открывается после подтверждения оплаты администратором платформы либо автоматически, если на сайте доступен подключенный платежный провайдер.",
      "Доступ является персональным, предоставляется только зарегистрированному пользователю и не подлежит передаче третьим лицам.",
      "Исполнитель вправе ограничить доступ при нарушении оферты, злоупотреблении функционалом или попытке несанкционированного распространения материалов.",
    ],
  },
  {
    id: "user-rights",
    title: "Права и обязанности пользователя",
    items: [
      "Использовать материалы платформы только в рамках личного доступа и выбранного тарифа.",
      "Не передавать доступ, учетные данные, материалы уроков и внутренние шаблоны третьим лицам.",
      "Загружать только те задания и файлы, на которые у пользователя есть права и которые не нарушают закон и права других лиц.",
    ],
  },
  {
    id: "provider-rights",
    title: "Права и обязанности исполнителя",
    items: [
      "Поддерживать работоспособность платформы в разумных пределах и развивать ее содержание.",
      "Проверять задания, модерировать переписку и открывать доступ согласно оплаченному тарифу.",
      "Обновлять уроки, интерфейс, состав программы и внутренние процессы без ухудшения уже оплаченного объема доступа.",
    ],
  },
  {
    id: "refunds",
    title: "Возвраты и споры",
    items: [
      "Запрос на возврат рассматривается индивидуально с учетом факта оплаты, объема уже предоставленного доступа, активации тарифа и требований законодательства РФ.",
      "Если пользователю уже был предоставлен полный или частичный доступ к цифровому контенту, это учитывается при рассмотрении возврата.",
      "Для разбора спорной ситуации пользователь должен написать в поддержку и приложить сведения об оплате.",
    ],
  },
  {
    id: "liability",
    title: "Ограничение ответственности",
    items: [
      "Платформа предоставляет обучающие материалы, шаблоны и обратную связь, но не гарантирует одинаковый коммерческий или творческий результат для каждого пользователя.",
      "Исполнитель не несет ответственности за сбои, вызванные действиями третьих лиц, провайдеров связи, платежных сервисов или нарушением пользователем правил использования платформы.",
    ],
  },
  {
    id: "payment-services",
    title: "Персональные данные и платежные сервисы",
    items: [
      "Обработка персональных данных осуществляется в соответствии с политикой конфиденциальности, размещенной на сайте.",
      `При подключении Robokassa или иного платежного сервиса пользователь также соглашается с правилами такого провайдера. Для Robokassa ориентиром служат официальные документы: ${ROBOKASSA_PRIVACY_POLICY_URL} и ${ROBOKASSA_PARTNER_OFFER_URL}`,
    ],
  },
  {
    id: "contacts",
    title: "Контакты",
    items: [
      `Исполнитель: ${LEGAL_PROVIDER_NAME}`,
      `Email поддержки: ${LEGAL_CONTACT_EMAIL}`,
      `Telegram: ${LEGAL_CONTACT_TELEGRAM}`,
    ],
  },
];

export default function PublicOfferPage() {
  return (
    <LegalPageShell
      title="Публичная оферта"
      description="Оферта на предоставление доступа к образовательной платформе AI Easy Life. Документ подходит и для текущей ручной оплаты, и для будущего подключения Robokassa."
      navigation={sections.map(({ id, title }) => ({ id, title }))}
    >
      <article className="surface surface-glow fade-up p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700 md:text-xs">
          Главное
        </p>

        <div className="mt-3 grid gap-2.5 md:hidden">
          <div className="rounded-[22px] bg-white/92 px-4 py-3 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Как принимается оферта</p>
            <p className="small-text mt-1.5 text-sm">
              Регистрация, оплата или фактическое использование платформы после открытия доступа.
            </p>
          </div>
          <div className="rounded-[22px] bg-white/92 px-4 py-3 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Как проходит оплата</p>
            <p className="small-text mt-1.5 text-sm">
              Сейчас по реквизитам. В дальнейшем может быть подключена Robokassa.
            </p>
          </div>
          <div className="rounded-[22px] bg-white/92 px-4 py-3 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Когда откроется доступ</p>
            <p className="small-text mt-1.5 text-sm">
              После подтверждения оплаты администратором или автоматически через платежный сервис.
            </p>
          </div>
        </div>

        <div className="mt-3 hidden gap-3 md:grid md:grid-cols-3">
          <div className="rounded-[24px] bg-white/92 p-4 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Как принять оферту</p>
            <p className="small-text mt-2">
              Регистрация, оплата тарифа или фактическое использование платформы после получения доступа.
            </p>
          </div>
          <div className="rounded-[24px] bg-white/92 p-4 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Как оплачивается</p>
            <p className="small-text mt-2">
              Сейчас доступ можно оплатить по реквизитам. Позже может быть подключена Robokassa.
            </p>
          </div>
          <div className="rounded-[24px] bg-white/92 p-4 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Когда откроется доступ</p>
            <p className="small-text mt-2">
              После подтверждения оплаты администратором или автоматически через платежный сервис.
            </p>
          </div>
        </div>
      </article>

      <article className="surface surface-glow fade-up p-4 md:p-6">
        <h2 className="text-lg font-bold leading-snug md:text-xl">Тарифы, действующие на сайте</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[24px] bg-white/92 p-4 ring-1 ring-[var(--line)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold md:text-lg">{plan.title}</p>
                  <p className="small-text mt-1 break-words">{plan.subtitle}</p>
                </div>
                <p className="shrink-0 text-base font-bold md:text-lg">{plan.priceLabel}</p>
              </div>

              <ul className="mt-3 grid gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-2xl bg-sky-50 px-3 py-2 text-sm leading-relaxed text-[var(--ink)] ring-1 ring-sky-100"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href="/billing" className="action-button primary-button w-full">
            К оплате
          </Link>
          <Link href="/privacy-policy" className="action-button secondary-button w-full">
            Политика конфиденциальности
          </Link>
        </div>
      </article>

      <div className="grid gap-3 md:hidden">
        {sections.map((section) => (
          <details
            id={section.id}
            key={section.id}
            className="surface fade-up scroll-mt-24 overflow-hidden p-0"
          >
            <summary className="cursor-pointer list-none px-4 py-4 text-base font-bold leading-snug text-[var(--ink)]">
              {section.title}
            </summary>
            <div className="border-t border-[var(--line)] px-4 py-4">
              <ul className="grid gap-2.5">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl bg-white/88 px-4 py-3 text-sm leading-relaxed text-[var(--ink)] ring-1 ring-[var(--line)] break-words"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>

      <div className="hidden gap-3 md:grid md:gap-4">
        {sections.map((section) => (
          <article
            id={section.id}
            key={section.id}
            className="surface fade-up scroll-mt-24 p-4 md:p-6"
          >
            <h2 className="text-lg font-bold leading-snug md:text-xl">{section.title}</h2>
            <ul className="mt-3 grid gap-2.5">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl bg-white/88 px-4 py-3 text-sm leading-relaxed text-[var(--ink)] ring-1 ring-[var(--line)] break-words"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </LegalPageShell>
  );
}
