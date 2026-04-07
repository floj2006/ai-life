# AI Easy Life

Платформа для новичков, которые хотят использовать AI в повседневных задачах: фото, видео, тексты и прикладные бизнес-сценарии.

## Стек
- Frontend: Next.js App Router
- Backend: Supabase
- Auth: Supabase Auth
- Notifications: Resend
- Payment: direct payment by requisites
- Practice tool: Syntx AI

## Что уже есть в продукте
- `50` уроков с уровнями `Newbie / Start / Max`
- личный кабинет с курсами, заданиями и прогрессом
- отправка медиа-результатов прямо внутри платформы
- экран проверки заданий для администратора
- ручная выдача тарифов через `/admin`
- юридические страницы: оферта и политика
- внутренняя телеметрия: события, клиентские ошибки, админ-аудит

## Доступ по тарифам
- `Newbie` видит только уроки уровня `Newbie`
- `Start` видит `Newbie + Start`
- `Max` видит все `50` уроков

## Environment
Создайте `.env.local` на основе `.env.example`.

Обязательные переменные:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_xxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxx

NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ADMIN_EMAILS=your-email@example.com

NEXT_PUBLIC_DIRECT_PAYMENT_START_REQUISITES=Банк: ...\nПолучатель: ...\nНомер карты/счета: ...
NEXT_PUBLIC_DIRECT_PAYMENT_MAX_REQUISITES=Банк: ...\nПолучатель: ...\nНомер карты/счета: ...
NEXT_PUBLIC_DIRECT_PAYMENT_REQUISITES=
NEXT_PUBLIC_DIRECT_PAYMENT_CONTACT_TEXT=@your_username
NEXT_PUBLIC_DIRECT_PAYMENT_CONTACT_URL=

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=AI Easy Life <noreply@your-domain.com>
```

Важно:
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` должен быть публичным ключом.
- `APP_ADMIN_EMAILS` принимает список email через запятую.
- `RESEND_FROM_EMAIL` должен быть подтвержден в Resend.
- В Supabase Auth -> URL Configuration добавьте `http://localhost:3000/reset-password`.

## База данных
Запустите SQL из:
- `supabase/schema.sql`

Основные таблицы:
- `users`
- `lessons`
- `progress`
- `lesson_submissions`
- `submission_messages`
- `analytics_events`
- `app_error_events`
- `admin_audit_logs`

Storage bucket:
- `submission-results`

## Оплата
Основной сценарий оплаты сейчас:
1. пользователь открывает `/billing`
2. копирует реквизиты нужного тарифа
3. отправляет подтверждение вам
4. вы вручную выдаете доступ через `/admin`

Тарифы:
- `Start` — `990 ₽`
- `Max` — `1 399 ₽`

Legacy YooKassa:
- роуты `src/app/api/yookassa/*` пока остаются в репозитории как legacy-слой
- основной payment UX сейчас строится не на YooKassa, а на ручной оплате по реквизитам

## Как проходит домашняя работа
Ученик:
1. открывает урок
2. выполняет задачу в `Syntx AI`
3. загружает изображение или видео прямо в платформу
4. пишет короткий комментарий
5. отправляет задание на проверку

Админ:
1. открывает `/review`
2. видит очередь `Новые / В работе / Завершенные`
3. меняет статус
4. при необходимости вставляет шаблон ответа
5. продолжает переписку внутри задания

Статусы:
- `sent`
- `in_review`
- `needs_revision`
- `approved`

## Админка
Страница:
- `/admin`

Что умеет:
- показывает список пользователей
- позволяет вручную выдать `Newbie / Start / Max`
- показывает последние админ-действия
- показывает сводку телеметрии за последние 24 часа

## Сброс пароля
На `/auth` есть сценарий `Забыли пароль?`

Поток:
1. пользователь вводит email
2. Supabase отправляет письмо
3. ссылка ведет на `/reset-password`
4. пользователь задает новый пароль

## Контент как источник правды
Контент уроков хранится в:
- `src/lib/content.ts`

Seed для базы синхронизирован с приложением:
- `supabase/schema.sql`

Ожидаемое состояние:
- `50` уроков
- те же `slug`, `sort_order`, `category`, `tier`, что и в коде
- единый сервис для практики: `https://syntx.ai/welcome/cE7WYqi2`

## Локальный запуск
```bash
npm install
npm run dev
```

## Deploy на Render
В репозитории уже есть `render.yaml`, поэтому проект можно поднять как обычный Render Web Service без создания новой базы.

Шаги:
1. Откройте Render и создайте `Blueprint` или `Web Service` из этого GitHub-репозитория.
2. Если Render спросит про базу данных, не создавайте новую Supabase-базу, если у вас уже есть свой проект Supabase.
3. Добавьте переменные окружения из вашей текущей Supabase-базы:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ваш_публичный_ключ
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_ключ
APP_ADMIN_EMAILS=ваш@email.ru
NEXT_PUBLIC_APP_URL=https://ваш-домен.onrender.com
```

Дополнительно для оплаты и уведомлений:

```env
NEXT_PUBLIC_DIRECT_PAYMENT_START_REQUISITES=...
NEXT_PUBLIC_DIRECT_PAYMENT_MAX_REQUISITES=...
NEXT_PUBLIC_DIRECT_PAYMENT_REQUISITES=
NEXT_PUBLIC_DIRECT_PAYMENT_CONTACT_TEXT=@your_username
NEXT_PUBLIC_DIRECT_PAYMENT_CONTACT_URL=
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=AI Easy Life <noreply@your-domain.com>
```

4. После первого деплоя выполните SQL из `supabase/schema.sql` в вашей Supabase-базе, если база пустая.
5. Если вы меняли переменные окружения, сделайте Redeploy сервиса.

## Проверка
```bash
npm run lint
npm run build
```

## Cleanup медиа-файлов
Проверить orphan-файлы в storage без удаления:

```bash
npm run cleanup:submission-storage
```

Удалить orphan-файлы старше 24 часов:

```bash
npm run cleanup:submission-storage -- --apply
```

Изменить grace period:

```bash
npm run cleanup:submission-storage -- --grace-hours=48
```

## Что уже логируется
### Analytics events
- `page_view`
- `lesson_view`
- `billing_page_view`
- `upgrade_cta_clicked`
- `billing_requisites_copied`
- `auth_signup_success`
- `auth_signin_success`
- `auth_password_reset_requested`
- `submission_created`

### Error events
- client-side runtime errors
- unhandled promise rejections
- render errors через `global-error.tsx`

### Admin audit
- смена тарифа пользователя
- смена статуса задания

## P0: Перед публичным запуском сегодня
1. Применить свежий `supabase/schema.sql`.
2. Ротировать все ключи, которые уже светились:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - любые старые платежные/test keys
3. Проверить `.env.local` и прод-окружение.
4. Пройти вручную smoke test:
   - регистрация -> вход -> урок -> отправка задания
   - админ -> review -> статус -> выдача тарифа
   - mobile -> урок -> оферта -> billing
5. Проверить в Supabase, что новые таблицы `analytics_events`, `app_error_events`, `admin_audit_logs` созданы.

## P1: Первые дни после запуска
1. Проверять `/admin` и таблицы телеметрии хотя бы 2-3 раза в день.
2. Смотреть на:
   - просмотры страниц
   - количество отправок заданий
   - клиентские ошибки
   - последние действия администратора
3. Запускать cleanup медиа-файлов по dry-run.
4. Проверить, что ученики не видят чужие задания и не получают чужие роли.

## P2: Следующий этап
1. Подключить внешний error monitoring вроде Sentry при необходимости.
2. Перевести rate limiting на Redis/Upstash, если проект уйдет на несколько инстансов.
3. Подключить Robokassa как основной платежный контур.
4. Вынести уведомления и тяжелые операции в background jobs.

## Release Checklist
- В UI нет битой кириллицы на ключевых экранах.
- `Review / Admin` используют единые статусы: `Новая / На проверке / Нужна доработка / Принято`.
- `README` соответствует текущему продукту: `50 lessons`, `direct payment`, `Syntx AI`.
- `src/lib/content.ts` и `supabase/schema.sql` синхронизированы по каталогу уроков.
- `Newbie / Start / Max` ограничиваются и в UI, и в API.
- `npm run lint` и `npm run build` проходят.
