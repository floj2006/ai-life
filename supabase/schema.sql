-- Run this in Supabase SQL Editor.
-- Safe for existing projects: includes migration steps and backfill.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  is_pro boolean not null default false,
  subscription_tier text not null default 'newbie',
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null,
  video_url text not null,
  instruction text not null,
  ai_tool_url text not null,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 5),
  sort_order int not null default 0,
  is_premium boolean not null default false,
  goal text,
  steps jsonb,
  prompt_template text,
  expected_result text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.lesson_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'sent',
  result_link text,
  student_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  constraint lesson_submissions_status_check
    check (status in ('sent', 'in_review', 'needs_revision', 'approved'))
);

create index if not exists lesson_submissions_user_idx
  on public.lesson_submissions(user_id);

create index if not exists lesson_submissions_lesson_idx
  on public.lesson_submissions(lesson_id);

create table if not exists public.submission_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.lesson_submissions(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  author_role text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint submission_messages_author_role_check
    check (author_role in ('student', 'admin'))
);

create index if not exists submission_messages_submission_idx
  on public.submission_messages(submission_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  route_path text,
  user_id uuid references public.users(id) on delete set null,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  client_ip text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx
  on public.analytics_events(created_at desc);

create index if not exists analytics_events_name_idx
  on public.analytics_events(event_name);

create table if not exists public.app_error_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  stack text,
  route_path text,
  user_id uuid references public.users(id) on delete set null,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists app_error_events_created_idx
  on public.app_error_events(created_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_user_id uuid references public.users(id) on delete set null,
  target_submission_id uuid references public.lesson_submissions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs(created_at desc);

create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs(action);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'submission-results',
  'submission-results',
  false,
  62914560,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- Migration: add role tier for Start/Max access model.
alter table public.users add column if not exists subscription_tier text;

update public.users
set subscription_tier = case
  when is_pro = true then 'max'
  else 'newbie'
end
where subscription_tier is null
   or subscription_tier not in ('newbie', 'start', 'max');

alter table public.users alter column subscription_tier set default 'newbie';
alter table public.users alter column subscription_tier set not null;

alter table public.users drop constraint if exists users_subscription_tier_check;
alter table public.users
  add constraint users_subscription_tier_check
  check (subscription_tier in ('newbie', 'start', 'max'));

-- Migration: add structured fields if they do not exist yet.
alter table public.lessons add column if not exists goal text;
alter table public.lessons add column if not exists steps jsonb;
alter table public.lessons add column if not exists prompt_template text;
alter table public.lessons add column if not exists expected_result text;
alter table public.lessons add column if not exists category text;

-- Backfill structured fields from existing data.
update public.lessons
set category = case
  when slug like 'photo-%' then 'photo'
  when slug like 'video-%' then 'video'
  else 'text'
end
where category is null
   or category not in ('photo', 'video', 'text', 'business');

update public.lessons
set goal = coalesce(nullif(goal, ''), short_description)
where goal is null or goal = '';

update public.lessons
set steps = '[]'::jsonb
where steps is null or jsonb_typeof(steps) <> 'array';

update public.lessons
set prompt_template = coalesce(nullif(prompt_template, ''), instruction)
where prompt_template is null or prompt_template = '';

update public.lessons
set expected_result = coalesce(
  nullif(expected_result, ''),
  'Готовый результат за несколько минут.'
)
where expected_result is null or expected_result = '';

-- Lock constraints after backfill.
alter table public.lessons alter column category set default 'text';
alter table public.lessons alter column category set not null;
alter table public.lessons alter column goal set default '';
alter table public.lessons alter column goal set not null;
alter table public.lessons alter column steps set default '[]'::jsonb;
alter table public.lessons alter column steps set not null;
alter table public.lessons alter column prompt_template set default '';
alter table public.lessons alter column prompt_template set not null;
alter table public.lessons alter column expected_result set default '';
alter table public.lessons alter column expected_result set not null;

alter table public.lessons drop constraint if exists lessons_category_check;
alter table public.lessons
  add constraint lessons_category_check
  check (category in ('photo', 'video', 'text', 'business'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.lessons enable row level security;
alter table public.progress enable row level security;
alter table public.lesson_submissions enable row level security;
alter table public.submission_messages enable row level security;
alter table public.analytics_events enable row level security;
alter table public.app_error_events enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Authenticated users can view lessons" on public.lessons;
create policy "Authenticated users can view lessons"
  on public.lessons for select
  to authenticated
  using (true);

drop policy if exists "Users can read own progress" on public.progress;
create policy "Users can read own progress"
  on public.progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.progress;
create policy "Users can insert own progress"
  on public.progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.progress;
create policy "Users can update own progress"
  on public.progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own submissions" on public.lesson_submissions;
create policy "Users can read own submissions"
  on public.lesson_submissions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own submissions" on public.lesson_submissions;
create policy "Users can insert own submissions"
  on public.lesson_submissions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own submissions" on public.lesson_submissions;
create policy "Users can update own submissions"
  on public.lesson_submissions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own submission messages" on public.submission_messages;
create policy "Users can read own submission messages"
  on public.submission_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.lesson_submissions s
      where s.id = submission_messages.submission_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own submission messages" on public.submission_messages;
create policy "Users can insert own submission messages"
  on public.submission_messages for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.lesson_submissions s
      where s.id = submission_messages.submission_id
        and s.user_id = auth.uid()
    )
  );

-- Seed lesson catalog (50 lessons) synced with src/lib/content.ts.
insert into public.lessons (
  id,
  slug,
  title,
  short_description,
  video_url,
  instruction,
  ai_tool_url,
  duration_minutes,
  sort_order,
  is_premium,
  goal,
  steps,
  prompt_template,
  expected_result,
  category
)
values
  (
    '00000000-0000-4000-8000-000000000001'::uuid,
    'photo-start',
    'Аватарка без пластика',
    'Первый урок по фото: делаем чистый портрет, который выглядит живым, а не нарисованным.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    1,
    false,
    'Сделать реалистичную аватарку для профиля или мессенджера без лишней ретуши.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените имя человека, настроение, фон и одежду.","Сделайте 3 варианта и сравните их по естественности лица, свету и аккуратному фону.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать реалистичную аватарку для профиля или мессенджера без лишней ретуши.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Photorealistic head-and-shoulders portrait of {человек}, natural skin texture, soft window light, clean neutral background, relaxed confident expression, 85mm lens look, realistic colors, no plastic skin, high detail, 4k.

Что должно получиться: Готовая аватарка для профиля, которая выглядит аккуратно и естественно.',
    'Готовая аватарка для профиля, которая выглядит аккуратно и естественно.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000002'::uuid,
    'photo-background',
    'Замена фона без ручной вырезки',
    'Учимся менять фон так, чтобы человек не выглядел вырезанным из другого кадра.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    2,
    false,
    'Получить фото с новым фоном, сохранив естественные края, свет и пропорции.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените локацию, стиль фона, свет и одежду героя.","Сделайте 3 варианта и сравните их по стыковке света, краям силуэта и ощущению целостного кадра.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Получить фото с новым фоном, сохранив естественные края, свет и пропорции.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Edit this portrait into a clean professional scene: keep the face identity, preserve hair edges, match lighting to a bright modern interior, realistic shadows, natural skin texture, seamless background integration, no cutout look, high detail.

Что должно получиться: Фото с новым фоном, которое смотрится цельно и подходит для профиля или поста.',
    'Фото с новым фоном, которое смотрится цельно и подходит для профиля или поста.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000003'::uuid,
    'video-reels',
    'Один хук, один ролик',
    'Собираем короткий ролик для соцсетей без сложного монтажа и лишних сцен.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    3,
    false,
    'Сделать простой вертикальный ролик с понятным началом и одной сильной мыслью.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените тему ролика, героя и действие в кадре.","Соберите 2-3 версии и сравните их по понятному первому кадру, темпу и чистому движению камеры.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать простой вертикальный ролик с понятным началом и одной сильной мыслью.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Vertical 9:16 short video, 6 seconds, single clear idea: {герой} показывает {действие}, strong hook in the first second, smooth camera motion, clean natural light, realistic movement, simple background, no abrupt cuts.

Что должно получиться: Короткий ролик, который можно использовать как основу для Reels или Shorts.',
    'Короткий ролик, который можно использовать как основу для Reels или Shorts.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000004'::uuid,
    'video-subtitles',
    'Текст на экране без хаоса',
    'Показываем, как собрать ролик, где текст на экране помогает смотреть дальше.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    4,
    false,
    'Сделать ролик с ясной структурой и удобными субтитрами для просмотра без звука.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените тему ролика, ключевую фразу и стиль подачи.","Соберите 2-3 версии и сравните их по читабельности текста, ясности структуры и удержанию внимания.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать ролик с ясной структурой и удобными субтитрами для просмотра без звука.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a vertical 9:16 explainer video for {тема}, first frame with a strong text hook, medium close-up speaker, bold readable subtitles synced to key phrases, clean background, soft professional light, 8 seconds, smooth pacing.

Что должно получиться: Ролик с понятными субтитрами, который удобно смотреть в ленте.',
    'Ролик с понятными субтитрами, который удобно смотреть в ленте.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000005'::uuid,
    'text-post',
    'Первый пост о себе',
    'Пишем короткий пост о себе или проекте так, чтобы его было легко дочитать.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    5,
    false,
    'Сделать простой пост-знакомство, где сразу понятны польза, тема и стиль автора.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените тему, аудиторию и ключевую пользу поста.","Соберите 2-3 версии и выберите лучшую по сильному первому предложению, простоте текста и ясному CTA.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать простой пост-знакомство, где сразу понятны польза, тема и стиль автора.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Напиши пост-знакомство для {аудитория} на тему {тема}. Структура: 1 короткий хук, кто я и чем полезен, 3 конкретных тезиса, мягкий CTA. Тон: дружелюбный, уверенный, без воды, до 120 слов.

Что должно получиться: Готовый пост, который можно сразу опубликовать в Telegram, VK или Instagram.',
    'Готовый пост, который можно сразу опубликовать в Telegram, VK или Instagram.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000006'::uuid,
    'text-product',
    'Как объяснить услугу за 20 секунд',
    'Учим превращать расплывчатое описание услуги в понятное предложение для клиента.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    6,
    false,
    'Сформулировать услугу простыми словами так, чтобы клиент понял ценность за 20 секунд.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте название услуги, аудиторию и главный результат для клиента.","Попросите 2-3 варианта и оцените их по ясности выгоды, конкретике и отсутствию шаблонных фраз.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Сформулировать услугу простыми словами так, чтобы клиент понял ценность за 20 секунд.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Сформулируй описание услуги {услуга} для {аудитория}. Нужны: кому подходит, какой результат получает клиент, что входит в работу, чем это лучше обычного решения, мягкий CTA. Пиши просто, конкретно, без канцелярита.

Что должно получиться: Готовое описание услуги для профиля, карточки или сообщения клиенту.',
    'Готовое описание услуги для профиля, карточки или сообщения клиенту.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000007'::uuid,
    'pro-photo-style',
    'Фирменный стиль фотосъемки для бренда',
    'Продвинутый урок: строим узнаваемый визуальный стиль, который держится от кадра к кадру.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    7,
    true,
    'Собрать устойчивый визуальный стиль бренда: палитра, свет, ракурс и настроение.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените бренд, цветовую палитру, эмоцию и сцену.","Сделайте 3 варианта и сравните их по согласованности стиля, повторяемости и коммерческой пригодности.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Собрать устойчивый визуальный стиль бренда: палитра, свет, ракурс и настроение.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a premium branded portrait for {бренд}: consistent color palette {палитра}, controlled soft light, refined styling, editorial composition, realistic skin and fabric textures, premium campaign feel, recognizable visual identity, 4k.

Что должно получиться: Ключевой кадр, который задает фирменный визуальный стиль бренда.',
    'Ключевой кадр, который задает фирменный визуальный стиль бренда.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000008'::uuid,
    'pro-video-plan',
    '30 видеоидей под продажи',
    'Не просто один ролик, а система тем и форматов, которую можно использовать целый месяц.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    8,
    true,
    'Получить продуманную сетку видеоидей под контент и продажи на 30 дней.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените нишу, продукт, целевую аудиторию и цель контента.","Соберите 2-3 версии и сравните их по разнообразию тем, логике прогрева и применимости плана.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Получить продуманную сетку видеоидей под контент и продажи на 30 дней.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Собери контент-план видео на 30 дней для {ниша}. Нужны 30 тем с разделением по неделям: охват, доверие, экспертность, продажа. Для каждой темы дай формат ролика, хук, основную мысль и CTA.

Что должно получиться: Готовый месячный план роликов с понятной логикой публикаций.',
    'Готовый месячный план роликов с понятной логикой публикаций.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000009'::uuid,
    'pro-text-funnel',
    'Текстовый прогрев к покупке',
    'Собираем не один пост, а связку текстов, которая ведет читателя к покупке.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    9,
    true,
    'Построить короткую текстовую воронку: интерес, доверие, решение, действие.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените продукт, аудиторию, возражение и конечное действие.","Соберите 2-3 версии и выберите лучшую по логике прогрева, связности сообщений и силе CTA.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Построить короткую текстовую воронку: интерес, доверие, решение, действие.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Сделай серию из 5 текстов для прогрева к продаже {продукт}. Этапы: внимание, проблема, доверие, решение, CTA. Для каждого текста дай цель, короткий хук, 3-4 предложения сути и финальное действие.

Что должно получиться: Серия текстов, которую можно использовать как мини-воронку в канале или рассылке.',
    'Серия текстов, которую можно использовать как мини-воронку в канале или рассылке.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000010'::uuid,
    'pro-system',
    'Система оффера и продаж для мини-продукта',
    'Продвинутый бизнес-урок: соединяем продукт, цену, аргументы и путь клиента в одну систему.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    10,
    true,
    'Собрать базовую систему продаж для мини-продукта: оффер, тариф, аргументы, сценарий закрытия.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте продукт, цену, аудиторию и главную боль клиента.","Попросите 2-3 варианта и оцените их по связке оффера, тарифа, аргументов и следующего шага.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Собрать базовую систему продаж для мини-продукта: оффер, тариф, аргументы, сценарий закрытия.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Построй систему продаж для мини-продукта {продукт}. Нужны: 1) оффер в одном предложении 2) структура тарифа 3) ключевые аргументы ценности 4) сценарий сообщения после интереса клиента 5) 3 частых возражения и ответы.

Что должно получиться: Готовая базовая схема продаж, которую можно сразу внедрять в переписке и на лендинге.',
    'Готовая базовая схема продаж, которую можно сразу внедрять в переписке и на лендинге.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000011'::uuid,
    'photo-portrait-style',
    'Лента из трех портретов',
    'Делаем серию портретов, которые выглядят как одна цельная съемка, а не случайный набор кадров.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    11,
    false,
    'Собрать серию из нескольких портретов с единым стилем для профиля или контент-плана.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените героя, стиль одежды, цвет сцены и настроение съемки.","Сделайте 3 варианта и сравните их по единому стилю между кадрами и аккуратному сохранению лица.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Собрать серию из нескольких портретов с единым стилем для профиля или контент-плана.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a consistent portrait series of {человек}: same outfit mood, same color palette {палитра}, clean soft light, subtle editorial feel, realistic skin texture, matching framing across all images, social media ready.

Что должно получиться: Серия портретов в одном стиле для личного бренда или экспертного блога.',
    'Серия портретов в одном стиле для личного бренда или экспертного блога.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000012'::uuid,
    'photo-product-card',
    'Карточка товара под маркетплейс',
    'Учимся получать фото товара, которое выглядит аккуратно и повышает доверие к карточке.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    12,
    false,
    'Сделать главное фото товара для карточки без шума, лишних теней и грязных отражений.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените товар, материал, цвет фона и угол съемки.","Сделайте 3 варианта и сравните их по читабельности товара, чистоте фона и коммерческому виду кадра.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать главное фото товара для карточки без шума, лишних теней и грязных отражений.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Premium e-commerce product shot of {товар}, isolated on clean background {фон}, realistic material texture, controlled reflections, softbox key light, subtle shadow, sharp edges, marketplace-ready composition, high detail.

Что должно получиться: Главное фото товара, которое можно ставить в карточку или лендинг.',
    'Главное фото товара, которое можно ставить в карточку или лендинг.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000013'::uuid,
    'video-hooks-pack',
    'Пакет хук-сцен для роликов',
    'Генерируем несколько сильных первых кадров, чтобы ролики цепляли с первой секунды.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    13,
    false,
    'Подготовить набор ярких начал для будущих роликов по одной теме.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените тему ролика, героя, продукт и эмоцию в первой секунде.","Соберите 2-3 версии и сравните их по силе первого кадра и разнообразию подач внутри одной темы.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить набор ярких начал для будущих роликов по одной теме.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Generate 5 short hook concepts for a vertical 9:16 video about {тема}. Each concept must have a visual first-second moment, one action by {герой}, one short line on screen, and a clear emotion trigger.

Что должно получиться: Набор рабочих хук-сцен, из которых можно собирать новые ролики.',
    'Набор рабочих хук-сцен, из которых можно собирать новые ролики.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000014'::uuid,
    'video-broll-generator',
    'B-roll для экспертного видео',
    'Добавляем видеовставки, которые делают экспертный ролик живее и дороже по ощущению.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    14,
    false,
    'Подготовить b-roll сцены для экспертного видео, чтобы усилить смысл и визуал.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените тему видео, предмет в кадре и рабочую сцену.","Соберите 2-3 версии и сравните их по плавности движения, атмосферности и полезности вставок.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить b-roll сцены для экспертного видео, чтобы усилить смысл и визуал.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a cinematic B-roll shot for an expert video about {тема}: slow dolly move, visible hands interacting with {предмет}, natural office or studio environment, shallow depth of field, clean highlights, 5 seconds, realistic motion.

Что должно получиться: Короткая видеовставка, которую можно вставить в экспертный ролик.',
    'Короткая видеовставка, которую можно вставить в экспертный ролик.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000015'::uuid,
    'text-email-reply',
    'Ответ клиенту, который двигает к оплате',
    'Учим писать ответ не просто вежливо, а так, чтобы клиент шел дальше по воронке.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    15,
    false,
    'Сделать письмо или сообщение клиенту, которое ведет к следующему шагу без давления.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте контекст диалога, услугу, вопрос клиента и нужный следующий шаг.","Попросите 2-3 варианта и оцените их по ясности, спокойному тону и движению к оплате или созвону.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Сделать письмо или сообщение клиенту, которое ведет к следующему шагу без давления.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Напиши ответ клиенту по ситуации: {контекст}. Цель ответа: {цель}. Формат: короткое признание запроса, понятное объяснение, аргумент ценности, один следующий шаг. Тон: спокойно, уверенно, без давления.

Что должно получиться: Готовый ответ клиенту для переписки, который двигает диалог к действию.',
    'Готовый ответ клиенту для переписки, который двигает диалог к действию.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000016'::uuid,
    'text-offer-cta',
    'Оффер с сильным призывом к действию',
    'Собираем предложение, в котором клиенту сразу понятно, что вы предлагаете и зачем откликаться.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    16,
    false,
    'Сформулировать оффер и CTA так, чтобы человек понял пользу и сделал следующий шаг.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте продукт, аудиторию, результат и желаемое действие.","Попросите 2-3 варианта и оцените их по четкости оффера, конкретике результата и силе призыва.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Сформулировать оффер и CTA так, чтобы человек понял пользу и сделал следующий шаг.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Сделай оффер для {продукт} под аудиторию {аудитория}. Дай: заголовок, 1 предложение ценности, 3 аргумента, короткий CTA. Не используй штампы, говори через конкретный результат клиента.

Что должно получиться: Короткий продающий блок для поста, карточки или лендинга.',
    'Короткий продающий блок для поста, карточки или лендинга.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000017'::uuid,
    'max-photo-brand-grid',
    'Шесть кадров для бренда',
    'Строим визуальную сетку бренда так, чтобы шесть кадров вместе смотрелись как одна история.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    17,
    true,
    'Создать согласованную сетку кадров для аккаунта, продукта или запуска.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените бренд, палитру, настроение и тип контента в кадре.","Сделайте 3 варианта и сравните их по связности сетки, ритму кадров и узнаваемости бренда.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Создать согласованную сетку кадров для аккаунта, продукта или запуска.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a 6-image brand grid for {бренд}: unified palette {палитра}, balanced mix of close-ups and medium shots, clean styling, premium natural light, realistic details, consistent brand mood across all images.

Что должно получиться: Готовая визуальная сетка из 6 кадров для упаковки бренда.',
    'Готовая визуальная сетка из 6 кадров для упаковки бренда.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000018'::uuid,
    'max-photo-scene-variants',
    'Одна сцена для трех площадок',
    'Учимся раскладывать одну идею на несколько фотоформатов под разные площадки.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    18,
    true,
    'Подготовить разные версии одной сцены для ленты, сторис и рекламного креатива.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените продукт, ключевую сцену, формат площадки и нужный акцент.","Сделайте 3 варианта и сравните их по адаптации под формат, сохранению идеи и чистоте композиции.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить разные версии одной сцены для ленты, сторис и рекламного креатива.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Generate 3 photo variants of one scene for {продукт}: feed cover, story frame, ad creative. Keep the same core idea, but adapt framing, text-safe zones and visual focus for each format. Realistic lighting, premium style.

Что должно получиться: Три версии одного визуала под разные задачи и площадки.',
    'Три версии одного визуала под разные задачи и площадки.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000019'::uuid,
    'max-video-series-30days',
    'Месяц роликов по разным углам',
    'Формируем видео-серию так, чтобы темы не дублировались и вели к разным целям.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    19,
    true,
    'Построить систему роликов на месяц с разными углами подачи и целями публикаций.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените нишу, аудиторию, продукт и тип контента.","Соберите 2-3 версии и сравните их по разнообразию сюжетов, последовательности и полезности для продвижения.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Построить систему роликов на месяц с разными углами подачи и целями публикаций.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a 30-day vertical video series plan for {ниша}. Split ideas into awareness, trust, objection handling and conversion. For each day give topic, hook, scene idea and CTA. Avoid repeating angles.

Что должно получиться: Полный план роликов на месяц без однотипных тем.',
    'Полный план роликов на месяц без однотипных тем.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000020'::uuid,
    'max-video-script-matrix',
    'Матрица сценариев под разные триггеры',
    'Делаем библиотеку сценариев, где каждый ролик завязан на свой триггер: боль, выгода, ошибка, кейс.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    20,
    true,
    'Собрать матрицу видеосценариев для разных триггеров и этапов прогрева.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените тему, продукт, целевую аудиторию и триггеры внимания.","Соберите 2-3 версии и сравните их по силе триггеров, различию сценариев и применимости в контенте.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Собрать матрицу видеосценариев для разных триггеров и этапов прогрева.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Build a short-form video script matrix for {продукт}. Give 12 scripts across 4 trigger types: pain, fast win, common mistake, proof. For each script add hook, main beat, visual scene and CTA.

Что должно получиться: Матрица сценариев, из которой можно быстро собирать новые ролики.',
    'Матрица сценариев, из которой можно быстро собирать новые ролики.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000021'::uuid,
    'syntx-21-text',
    'Быстрая проверка ниши перед запуском',
    'Учимся не запускать идею вслепую, а быстро проверять спрос и реальные сигналы рынка.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    21,
    false,
    'Понять, есть ли у ниши спрос, понятный клиент и шанс на первые заявки.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте нишу, аудиторию, продукт и желаемый результат проверки.","Попросите 2-3 варианта и оцените их по конкретике критериев, сигналам спроса и понятным выводам.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Понять, есть ли у ниши спрос, понятный клиент и шанс на первые заявки.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Проведи быструю проверку ниши {ниша}. Дай: для кого продукт, 5 признаков живого спроса, 5 тревожных сигналов, что проверить руками за 2 дня, и вывод — стоит ли тестировать дальше.

Что должно получиться: Короткий чек-лист валидации ниши перед запуском.',
    'Короткий чек-лист валидации ниши перед запуском.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000022'::uuid,
    'syntx-22-photo',
    'Шапка профиля, которая внушает доверие',
    'Создаем кадр, который сразу считывается как экспертный и аккуратный.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    22,
    false,
    'Сделать фото для шапки профиля, где считываются доверие, аккуратность и профессионализм.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените сферу деятельности, стиль одежды, фон и эмоцию героя.","Сделайте 3 варианта и сравните их по экспертному образу, чистоте композиции и естественному выражению.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать фото для шапки профиля, где считываются доверие, аккуратность и профессионализм.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Professional profile banner portrait of {человек} in {сфера}, clean workspace background, confident but warm expression, neat outfit, soft daylight, realistic texture, sharp eyes, premium personal brand style.

Что должно получиться: Фото для шапки профиля или блока о себе на сайте.',
    'Фото для шапки профиля или блока о себе на сайте.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000023'::uuid,
    'syntx-23-video',
    'Витрина продукта в 7 секунд',
    'Показываем продукт в движении так, чтобы зритель сразу понял, что это и зачем ему.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    23,
    false,
    'Сделать короткий ролик-демонстрацию продукта с быстрым пониманием пользы.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените продукт, среду использования и главную выгоду.","Соберите 2-3 версии и сравните их по ясности демонстрации, читаемости продукта и силе первого кадра.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать короткий ролик-демонстрацию продукта с быстрым пониманием пользы.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Vertical 9:16 product showcase, 7 seconds, {продукт} used in a realistic moment, hero benefit visible in the first 2 seconds, clean camera move, premium light, product remains clearly readable, no clutter.

Что должно получиться: Короткий ролик-витрина для карточки, рекламы или сторис.',
    'Короткий ролик-витрина для карточки, рекламы или сторис.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000024'::uuid,
    'syntx-24-text',
    'Кейс, который читают до конца',
    'Учимся писать кейс так, чтобы читатель увидел не хвастовство, а понятный результат.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    24,
    false,
    'Сделать короткий кейс-пост с ситуацией, действием, результатом и выводом.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените кейс, аудиторию, результат и практический вывод.","Соберите 2-3 версии и выберите лучшую по конкретике результата, логике истории и пользе для читателя.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать короткий кейс-пост с ситуацией, действием, результатом и выводом.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Напиши кейс-пост для {аудитория} по теме {кейс}. Структура: исходная ситуация, что сделали, какой получили результат, чему это учит, CTA. Тон: спокойно, предметно, без самовосхваления, до 150 слов.

Что должно получиться: Пост-кейс, который повышает доверие и показывает ваш подход.',
    'Пост-кейс, который повышает доверие и показывает ваш подход.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000025'::uuid,
    'syntx-25-photo',
    'Обложка для поста с сильным фокусом',
    'Собираем визуал, который сразу тянет взгляд к главной мысли публикации.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    25,
    false,
    'Получить обложку для поста, где главный объект считывается за секунду.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените тему поста, объект в кадре, палитру и настроение.","Сделайте 3 варианта и сравните их по силе фокуса, простоте композиции и читаемости в ленте.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Получить обложку для поста, где главный объект считывается за секунду.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a social post cover for {тема}: single strong focal object, clean composition, bold but realistic light, controlled color palette {палитра}, space for headline, high contrast without visual noise.

Что должно получиться: Обложка для поста или карточки, которая выделяется в ленте.',
    'Обложка для поста или карточки, которая выделяется в ленте.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000026'::uuid,
    'syntx-26-video',
    'Сценарий продающего созвона на 20 минут',
    'Строим разговор с клиентом так, чтобы он вел к решению, а не к бесконечной болтовне.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    26,
    false,
    'Получить структуру короткого созвона: вход, диагностика, презентация, следующий шаг.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте услугу, аудиторию, частые вопросы и желаемый итог созвона.","Попросите 2-3 варианта и оцените их по логике разговора, качеству вопросов и мягкому закрытию.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Получить структуру короткого созвона: вход, диагностика, презентация, следующий шаг.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Собери сценарий 20-минутного продающего созвона для {услуга}. Нужны блоки: разогрев, вопросы на диагностику, переход к решению, презентация ценности, закрытие на следующий шаг, 3 частых риска и как их обойти.

Что должно получиться: Готовый каркас созвона, который помогает вести клиента к решению.',
    'Готовый каркас созвона, который помогает вести клиента к решению.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000027'::uuid,
    'syntx-27-text',
    'Письма-истории для теплой базы',
    'Пишем письма, которые ведут человека от интереса к доверию через истории и конкретику.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    27,
    false,
    'Подготовить серию писем с историей, смыслом и понятным переходом к следующему письму.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените продукт, аудиторию, историю и главный урок для читателя.","Соберите 2-3 версии и выберите лучшую по связности серии, силе историй и переходам между письмами.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить серию писем с историей, смыслом и понятным переходом к следующему письму.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Создай серию из 3 писем для прогрева аудитории к {продукт}. Основа — история, которая показывает проблему, инсайт и решение. Для каждого письма дай тему, 1 главный сюжет, 1 вывод и CTA к следующему шагу.

Что должно получиться: Серия писем для мягкого прогрева перед оффером или запуском.',
    'Серия писем для мягкого прогрева перед оффером или запуском.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000028'::uuid,
    'syntx-28-photo',
    'Кейс клиента в одном сильном кадре',
    'Делаем визуал, который усиливает кейс и помогает показать ценность вашей работы.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    28,
    false,
    'Подготовить фото для кейса, где результат считывается быстро и выглядит убедительно.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените проект, итоговый объект, окружение и нужный акцент.","Сделайте 3 варианта и сравните их по убедительности результата, чистоте кадра и полезности для кейса.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить фото для кейса, где результат считывается быстро и выглядит убедительно.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a case-study image for {проект}: show the final result clearly, clean composition, realistic texture, subtle premium styling, natural light, visual proof of improvement, suitable for portfolio or website.

Что должно получиться: Фото для кейса или портфолио, которое усиливает доверие к результату.',
    'Фото для кейса или портфолио, которое усиливает доверие к результату.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000029'::uuid,
    'syntx-29-video',
    'Видео-ответ на частый вопрос клиента',
    'Делаем ролик, который снимает типовое возражение или отвечает на самый частый вопрос.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    29,
    false,
    'Подготовить короткий ролик-ответ, который экономит время в переписке и контенте.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените частый вопрос, продукт и ключевой ответ.","Соберите 2-3 версии и сравните их по четкости формулировки, пользы и простоте подачи.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить короткий ролик-ответ, который экономит время в переписке и контенте.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Vertical FAQ video, 9:16, 8 seconds. First frame shows the question: {вопрос}. Then {эксперт} gives a clear concise answer, calm hand gesture, clean background, readable on-screen text, soft professional light.

Что должно получиться: Готовый FAQ-ролик для сторис, Reels или закрепа.',
    'Готовый FAQ-ролик для сторис, Reels или закрепа.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000030'::uuid,
    'syntx-30-text',
    'Telegram-пост с сильным финалом',
    'Учимся писать Telegram-пост, который не теряет внимание после первой строки.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    30,
    false,
    'Сделать пост для Telegram с сильным началом, понятной серединой и действием в конце.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените тему поста, аудиторию и желаемую реакцию читателя.","Соберите 2-3 версии и выберите лучшую по удержанию внимания, ритму текста и силе окончания.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать пост для Telegram с сильным началом, понятной серединой и действием в конце.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Напиши Telegram-пост на тему {тема} для {аудитория}. Формат: хук в 1 строку, раскрытие сути в 3 абзацах, практический вывод, CTA. Стиль: живой, разговорный, без воды, до 900 знаков.

Что должно получиться: Готовый Telegram-пост, который читается легко и ведет к действию.',
    'Готовый Telegram-пост, который читается легко и ведет к действию.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000031'::uuid,
    'syntx-31-photo',
    'Тарифная линейка без путаницы',
    'Собираем уровни тарифа так, чтобы клиент понимал разницу между ними без созвона.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    31,
    false,
    'Разделить предложение на тарифы и объяснить ценность каждого уровня простыми словами.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте услугу, сегменты клиентов и границы каждого тарифа.","Попросите 2-3 варианта и оцените их по понятности различий, логике роста цены и удобству выбора.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Разделить предложение на тарифы и объяснить ценность каждого уровня простыми словами.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Собери тарифную линейку для {услуга}: Basic, Start, Max. Для каждого уровня дай кому подходит, что входит, какой результат получает клиент, почему растет цена и какой следующий шаг после выбора тарифа.

Что должно получиться: Структура тарифов, которую можно использовать в переписке, карточке или на сайте.',
    'Структура тарифов, которую можно использовать в переписке, карточке или на сайте.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000032'::uuid,
    'syntx-32-video',
    'Видео-инструкция для сервиса',
    'Показываем, как объяснить простой процесс в виде короткой и понятной инструкции.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    32,
    false,
    'Сделать короткое обучающее видео, где шаги считываются без перегруза.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените процесс, интерфейс и главный результат пользователя.","Соберите 2-3 версии и сравните их по понятности шагов, темпу и читаемости экрана.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать короткое обучающее видео, где шаги считываются без перегруза.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a short tutorial-style vertical video for {процесс}: step 1, step 2, final result. Clean screen-focused composition, clear hand or cursor guidance, minimal background noise, 8 seconds, readable text overlays.

Что должно получиться: Готовая короткая видео-инструкция для продукта или сервиса.',
    'Готовая короткая видео-инструкция для продукта или сервиса.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000033'::uuid,
    'syntx-33-text',
    'Карточка продукта без сложных слов',
    'Превращаем сложное описание в понятный текст, который легко читать и пересказать.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    33,
    false,
    'Сделать описание продукта, где понятны суть, польза и кому это подходит.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените продукт, аудиторию и ключевой результат.","Соберите 2-3 версии и выберите лучшую по ясности формулировок, простоте языка и полезности для клиента.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать описание продукта, где понятны суть, польза и кому это подходит.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Опиши продукт {продукт} для {аудитория} простыми словами. Нужны: чем это полезно, какой результат дает, 3 ключевых преимущества, для кого подходит и короткий CTA. Пиши так, чтобы понял новичок.

Что должно получиться: Описание продукта для сайта, карточки или переписки с клиентом.',
    'Описание продукта для сайта, карточки или переписки с клиентом.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000034'::uuid,
    'syntx-34-photo',
    'Товар с трех ключевых ракурсов',
    'Собираем не один кадр, а небольшую серию ракурсов для товара или продукта.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    34,
    false,
    'Подготовить серию товарных фото, где раскрыты вид, текстура и детали.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените товар, цвет фона, детали и нужные ракурсы.","Сделайте 3 варианта и сравните их по разнообразию ракурсов, аккуратности света и сохранению фактуры.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить серию товарных фото, где раскрыты вид, текстура и детали.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a mini product photo series of {товар}: front shot, detail close-up, lifestyle usage shot, texture-focused angle. Keep lighting consistent, premium realism, crisp edges, e-commerce quality, clean background.

Что должно получиться: Набор товарных фото для карточки, лендинга или соцсетей.',
    'Набор товарных фото для карточки, лендинга или соцсетей.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000035'::uuid,
    'syntx-35-video',
    'Сценарий экспертного talking-head',
    'Учимся делать ролик, где эксперт говорит просто, уверенно и не теряет внимание зрителя.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    35,
    false,
    'Подготовить сценарий и визуальный каркас talking-head ролика.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените тему, эксперта, основную мысль и CTA.","Соберите 2-3 версии и сравните их по четкости речи, структуре мысли и уверенной подаче.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить сценарий и визуальный каркас talking-head ролика.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Vertical expert talking-head video, 9:16, {эксперт} explains {тема} in one clear message, medium shot, calm gestures, readable on-screen keywords, soft studio light, credible and clean presentation, 10 seconds.

Что должно получиться: Короткий экспертный ролик, который можно использовать в контенте и прогреве.',
    'Короткий экспертный ролик, который можно использовать в контенте и прогреве.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000036'::uuid,
    'syntx-36-text',
    'Двухнедельный прогрев под продажи',
    'Собираем двухнедельный маршрут контента, который подогревает интерес и ведет к заявке.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    36,
    false,
    'Сделать контент-воронку на 14 дней с логикой прогрева и продаж.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте продукт, аудиторию, площадку и целевое действие.","Попросите 2-3 варианта и оцените их по последовательности прогрева, балансу пользы и продажи.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Сделать контент-воронку на 14 дней с логикой прогрева и продаж.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Собери контент-воронку на 14 дней для {продукт}. Для каждого дня дай формат, тему, цель публикации и CTA. Логика: внимание, доверие, кейсы, возражения, продажа. Без повторов тем.

Что должно получиться: Готовый двухнедельный контент-план под прогрев и продажи.',
    'Готовый двухнедельный контент-план под прогрев и продажи.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000037'::uuid,
    'syntx-37-photo',
    'Личный бренд: кадры для контента',
    'Создаем фотографии, которые можно использовать в постах, сторис и упаковке личного бренда.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    37,
    false,
    'Собрать универсальные кадры для контента: рабочий, эмоциональный и нейтральный.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените сферу деятельности, обстановку, одежду и настроение героя.","Сделайте 3 варианта и сравните их по универсальности кадров, выразительности и экспертному образу.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Собрать универсальные кадры для контента: рабочий, эмоциональный и нейтральный.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create personal brand content photos for {человек} in {сфера}: workspace shot, thoughtful portrait, action shot with tools, natural light, realistic skin texture, polished but authentic style, content-ready.

Что должно получиться: Серия кадров для постов, сторис и упаковки личного бренда.',
    'Серия кадров для постов, сторис и упаковки личного бренда.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000038'::uuid,
    'syntx-38-video',
    'UGC-ролик с демонстрацией пользы',
    'Показываем продукт в руках и в жизни так, чтобы ролик выглядел живым, а не постановочным.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    38,
    false,
    'Сделать UGC-ролик, где зритель быстро понимает пользу продукта.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените продукт, ситуацию использования и главный результат.","Соберите 2-3 версии и сравните их по натуральности подачи, полезности и удержанию первых секунд.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Сделать UGC-ролик, где зритель быстро понимает пользу продукта.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
UGC-style vertical video of {человек} using {продукт} in a realistic setting, handheld feel, natural speech energy, clear product benefit, product visible in hands, soft home light, 8 seconds.

Что должно получиться: Короткий UGC-ролик для рекламы, карточки или сторис.',
    'Короткий UGC-ролик для рекламы, карточки или сторис.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000039'::uuid,
    'syntx-39-text',
    'Дожим без давления',
    'Пишем письмо человеку, который уже заинтересован, но пока не принял решение.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    3,
    39,
    false,
    'Подготовить вежливое письмо-дожим без давления и манипуляций.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените продукт, контекст общения, возражение и следующий шаг.","Соберите 2-3 версии и выберите лучшую по мягкости тона, ясности аргумента и CTA.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить вежливое письмо-дожим без давления и манипуляций.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Напиши письмо теплому лиду по ситуации: {контекст}. Нужно мягко напомнить о ценности {продукт}, снять одно возражение, показать следующий шаг и не давить. 6-8 коротких предложений.

Что должно получиться: Готовое письмо для мягкого дожима теплого клиента.',
    'Готовое письмо для мягкого дожима теплого клиента.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000040'::uuid,
    'syntx-40-photo',
    'Визуал услуги для первого экрана',
    'Делаем ключевой визуал услуги, который подходит для лендинга или презентации.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    4,
    40,
    false,
    'Создать фото-обложку услуги, которая подчеркивает пользу и стиль предложения.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените услугу, настроение, цветовую палитру и главный объект.","Сделайте 3 варианта и сравните их по продающему впечатлению, чистоте сцены и стилю предложения.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Создать фото-обложку услуги, которая подчеркивает пользу и стиль предложения.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Hero image for a service landing page about {услуга}, premium clean composition, clear focal object, soft directional light, modern minimal scene, realistic details, text-safe space, polished commercial look.

Что должно получиться: Ключевой визуал для лендинга, презентации или закрепленного поста.',
    'Ключевой визуал для лендинга, презентации или закрепленного поста.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000041'::uuid,
    'syntx-41-video',
    'Где воронка теряет деньги',
    'Продвинутый урок по бизнесу: учимся смотреть на воронку через цифры, а не ощущения.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    41,
    true,
    'Понять, где именно в воронке теряются деньги, заявки или внимание клиента.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте продукт, этапы воронки, метрики и целевое действие.","Попросите 2-3 варианта и оцените их по точности разбора, приоритетам и выводам по узким местам.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Понять, где именно в воронке теряются деньги, заявки или внимание клиента.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Проведи аудит воронки продаж для {продукт}. Этапы: охват, лид, диалог, созвон, оплата. Для каждого этапа укажи метрику, возможную причину просадки, что проверить в первую очередь и быстрый эксперимент на 3 дня.

Что должно получиться: Разбор воронки по этапам с понятными действиями для исправления слабых мест.',
    'Разбор воронки по этапам с понятными действиями для исправления слабых мест.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000042'::uuid,
    'syntx-42-text',
    'Как вернуть спящих клиентов',
    'Собираем серию писем, которая возвращает старых клиентов мягко и без спама.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    42,
    true,
    'Подготовить реактивационную серию для тех, кто давно не покупал и не отвечал.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените продукт, сегмент базы, прошлую покупку и новое предложение.","Соберите 2-3 версии и выберите лучшую по уважительному тону, релевантности оффера и вероятности ответа.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить реактивационную серию для тех, кто давно не покупал и не отвечал.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Создай серию из 3 писем для реактивации старых клиентов по {продукт}. Письмо 1 — напоминание и польза, письмо 2 — новый повод вернуться, письмо 3 — ограниченное предложение. Для каждого дай тему, тело письма и CTA.

Что должно получиться: Серия писем для возврата старых клиентов в диалог и покупку.',
    'Серия писем для возврата старых клиентов в диалог и покупку.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000043'::uuid,
    'syntx-43-photo',
    'Lookbook бренда в единой палитре',
    'Строим визуальную историю бренда через серию кадров в одной палитре и одном настроении.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    43,
    true,
    'Создать lookbook-сет, который работает как упаковка бренда или запуска.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените бренд, палитру, стиль одежды и атмосферу съемки.","Сделайте 3 варианта и сравните их по единой палитре, атмосфере и премиальному виду серии.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Создать lookbook-сет, который работает как упаковка бренда или запуска.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a branded lookbook series for {бренд}: unified palette {палитра}, premium styling, realistic textile details, editorial lighting, consistent mood across all frames, fashion campaign quality, 4k.

Что должно получиться: Серия lookbook-кадров для бренда, запуска или каталога.',
    'Серия lookbook-кадров для бренда, запуска или каталога.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000044'::uuid,
    'syntx-44-video',
    'Недельный видеопрогрев перед оффером',
    'Собираем серию роликов не как случайный набор, а как маленький путь зрителя к доверию.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    44,
    true,
    'Подготовить недельную серию роликов с разной функцией: внимание, доверие, кейс, продажа.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените продукт, аудиторию, триггеры и формат публикации.","Соберите 2-3 версии и сравните их по связности роликов, разнообразию задач и логике прогрева.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить недельную серию роликов с разной функцией: внимание, доверие, кейс, продажа.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Build a 7-day short video warm-up sequence for {продукт}. Give one video per day: day 1 hook, day 2 problem, day 3 myth, day 4 proof, day 5 behind the scenes, day 6 objection handling, day 7 CTA. Add hook and scene idea for each.

Что должно получиться: Недельная видео-серия для прогрева аудитории перед оффером.',
    'Недельная видео-серия для прогрева аудитории перед оффером.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000045'::uuid,
    'syntx-45-text',
    'Скелет текста для лендинга',
    'Учимся раскладывать продуктовую страницу на смысловые блоки, а не писать сплошную простыню.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    45,
    true,
    'Собрать текстовую структуру страницы продукта: боль, решение, выгоды, доказательства, CTA.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените продукт, аудиторию, возражения и ключевую ценность.","Соберите 2-3 версии и выберите лучшую по логике блоков, ясности текста и силе продающих смыслов.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Собрать текстовую структуру страницы продукта: боль, решение, выгоды, доказательства, CTA.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Собери текстовую структуру страницы продукта {продукт}. Нужны блоки: герой, проблема, решение, выгоды, как это работает, доказательства, FAQ, CTA. Для каждого блока дай короткий текст и его задачу в продаже.

Что должно получиться: Готовый каркас текста для страницы продукта или лендинга.',
    'Готовый каркас текста для страницы продукта или лендинга.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000046'::uuid,
    'syntx-46-photo',
    'Маржа и окупаемость без Excel',
    'Продвинутый урок: раскладываем предложение по цифрам, чтобы видеть реальную экономику решения.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте его под свою задачу и отправьте лучший прикладной результат на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    46,
    true,
    'Понять маржу, допустимую стоимость лида и точку безубыточности простым языком.',
    '["Откройте Syntx AI и выберите модель Claude.","Вставьте промпт и подставьте продукт, цену, себестоимость и план продаж.","Попросите 2-3 варианта и оцените их по понятности цифр, правильным приоритетам и применимости в реальности.","Сохраните лучший вариант и отправьте его на проверку с коротким комментарием."]'::jsonb,
    'Задача урока: Понять маржу, допустимую стоимость лида и точку безубыточности простым языком.
Рекомендуемая модель в Syntx AI: Claude.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Разложи экономику предложения {продукт} простыми цифрами. Нужны: чек, себестоимость, валовая прибыль, допустимый CAC, точка безубыточности, запас по марже и 3 вывода для принятия решений. Пиши без сложной терминологии.

Что должно получиться: Понятный финансовый разбор предложения для принятия решений.',
    'Понятный финансовый разбор предложения для принятия решений.',
    'business'
  ),
  (
    '00000000-0000-4000-8000-000000000047'::uuid,
    'syntx-47-video',
    'Промо-ролик запуска с тремя версиями',
    'Создаем не один ролик, а три варианта запуска под разный угол подачи и рекламу.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    47,
    true,
    'Подготовить три версии промо-ролика для теста в запуске или рекламе.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените продукт, аудиторию, главный оффер и эмоциональный триггер.","Соберите 2-3 версии и сравните их по разнице между версиями, силе оффера и пригодности для теста.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить три версии промо-ролика для теста в запуске или рекламе.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create 3 launch promo video concepts for {продукт}: version 1 based on pain, version 2 based on desire, version 3 based on proof. Each concept should include hook, main visual scene, rhythm and CTA. Vertical 9:16.

Что должно получиться: Три концепции промо-ролика для теста оффера в запуске.',
    'Три концепции промо-ролика для теста оффера в запуске.',
    'video'
  ),
  (
    '00000000-0000-4000-8000-000000000048'::uuid,
    'syntx-48-text',
    '30 контент-заходов без самоповторов',
    'Собираем запас тем так, чтобы контент не повторялся и не упирался в один угол подачи.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, адаптируйте текст под свою аудиторию и отправьте лучший вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    48,
    true,
    'Подготовить матрицу контент-углов для месяца публикаций без однотипных идей.',
    '["Откройте Syntx AI и выберите модель GPT-4.1.","Вставьте промпт и замените нишу, продукт, аудиторию и площадку.","Соберите 2-3 версии и выберите лучшую по разнообразию углов, глубине тем и удобству работы с матрицей.","Сохраните готовый текст и отправьте его на проверку."]'::jsonb,
    'Задача урока: Подготовить матрицу контент-углов для месяца публикаций без однотипных идей.
Рекомендуемая модель в Syntx AI: GPT-4.1.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Собери матрицу из 30 контент-углов для {ниша}. Раздели идеи по блокам: боли, ошибки, быстрые результаты, кейсы, разборы, возражения, behind the scenes, продажи. Для каждой идеи дай короткий тезис и формат подачи.

Что должно получиться: Матрица тем на 30 публикаций без повторяющихся заходов.',
    'Матрица тем на 30 публикаций без повторяющихся заходов.',
    'text'
  ),
  (
    '00000000-0000-4000-8000-000000000049'::uuid,
    'syntx-49-photo',
    'Четыре креатива под один оффер',
    'Учимся делать несколько визуалов под один оффер так, чтобы было что тестировать в рекламе.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, подставьте свои данные, сделайте 2-3 варианта и отправьте лучший кадр на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    49,
    true,
    'Создать несколько рекламных креативов с разной подачей одного оффера.',
    '["Откройте Syntx AI и выберите модель FLUX Pro.","Вставьте промпт и замените оффер, продукт, аудиторию и визуальные триггеры.","Сделайте 3 варианта и сравните их по разнице между креативами, читаемости оффера и рекламной пригодности.","Сохраните лучший кадр и отправьте его на проверку."]'::jsonb,
    'Задача урока: Создать несколько рекламных креативов с разной подачей одного оффера.
Рекомендуемая модель в Syntx AI: FLUX Pro.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Generate 4 ad creative image concepts for {оффер}: one with direct benefit, one with transformation, one with emotional trigger, one with proof. Keep each visual clear, commercial, realistic, text-safe and high contrast.

Что должно получиться: Набор креативов для теста оффера в рекламе или соцсетях.',
    'Набор креативов для теста оффера в рекламе или соцсетях.',
    'photo'
  ),
  (
    '00000000-0000-4000-8000-000000000050'::uuid,
    'syntx-50-video',
    'Кейс-ролик: путь к результату',
    'Финальный видео-урок: показываем результат клиента через историю, факты и визуальные акценты.',
    'https://syntx.ai/welcome/cE7WYqi2',
    'Откройте Syntx AI, вставьте промпт, соберите 2-3 версии ролика и отправьте самый сильный вариант на проверку.',
    'https://syntx.ai/welcome/cE7WYqi2',
    5,
    50,
    true,
    'Собрать кейс-ролик, который усиливает доверие и показывает реальный результат клиента.',
    '["Откройте Syntx AI и выберите модель Kling.","Вставьте промпт и замените кейс, нишу клиента, результат и ключевой инсайт.","Соберите 2-3 версии и сравните их по доказательности, драматургии и силе финального вывода.","Сохраните лучший ролик и отправьте его на проверку."]'::jsonb,
    'Задача урока: Собрать кейс-ролик, который усиливает доверие и показывает реальный результат клиента.
Рекомендуемая модель в Syntx AI: Kling.
Перед запуском замените значения в фигурных скобках на свои данные.

Промпт:
Create a client case-study video structure for {кейс}: opening problem, what changed, key turning point, proof of result, final takeaway and CTA. Vertical 9:16, emotionally engaging but factual, clean realistic scenes.

Что должно получиться: Сценарная основа кейс-ролика, который можно использовать в прогреве и продажах.',
    'Сценарная основа кейс-ролика, который можно использовать в прогреве и продажах.',
    'video'
  )
on conflict (slug) do update set
  title = excluded.title,
  short_description = excluded.short_description,
  video_url = excluded.video_url,
  instruction = excluded.instruction,
  ai_tool_url = excluded.ai_tool_url,
  duration_minutes = excluded.duration_minutes,
  sort_order = excluded.sort_order,
  is_premium = excluded.is_premium,
  goal = excluded.goal,
  steps = excluded.steps,
  prompt_template = excluded.prompt_template,
  expected_result = excluded.expected_result,
  category = excluded.category;


