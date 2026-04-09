import { Client } from "pg";

const connectionString =
  process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.log(
    "[bootstrap-admin] SUPABASE_DB_URL не задан. Пропускаю инициализацию таблиц.",
  );
  process.exit(0);
}

const sql = `
create extension if not exists pgcrypto;

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

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text,
  discount_type text not null default 'percent',
  discount_value numeric(10,2) not null,
  plan_scope text not null default 'all',
  is_active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint promo_codes_discount_type_check
    check (discount_type in ('percent', 'fixed_rub')),
  constraint promo_codes_plan_scope_check
    check (plan_scope in ('all', 'start', 'max')),
  constraint promo_codes_discount_value_check
    check (discount_value > 0),
  constraint promo_codes_max_uses_check
    check (max_uses is null or max_uses > 0),
  constraint promo_codes_used_count_check
    check (used_count >= 0)
);

create table if not exists public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  payment_id text not null unique,
  plan_id text not null,
  payment_amount_rub numeric(10,2) not null,
  discount_rub numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint promo_code_redemptions_plan_id_check
    check (plan_id in ('start', 'max')),
  constraint promo_code_redemptions_discount_rub_check
    check (discount_rub >= 0)
);

create index if not exists promo_codes_created_idx
  on public.promo_codes(created_at desc);

create index if not exists promo_code_redemptions_created_idx
  on public.promo_code_redemptions(created_at desc);

alter table public.analytics_events enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_code_redemptions enable row level security;

notify pgrst, 'reload schema';
`;

const ssl =
  connectionString.toLowerCase().includes("sslmode=disable") ||
  connectionString.toLowerCase().includes("ssl=false")
    ? false
    : { rejectUnauthorized: false };

const client = new Client({
  connectionString,
  ssl,
});

try {
  await client.connect();
  await client.query(sql);
  console.log(
    "[bootstrap-admin] Таблицы analytics_events, admin_audit_logs, promo_codes готовы.",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[bootstrap-admin] Ошибка инициализации: ${message}`);
  console.log("[bootstrap-admin] Приложение будет запущено без аварийной остановки.");
} finally {
  await client.end().catch(() => undefined);
}
