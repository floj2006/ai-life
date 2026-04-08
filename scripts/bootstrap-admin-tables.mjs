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

alter table public.analytics_events enable row level security;
alter table public.admin_audit_logs enable row level security;

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
    "[bootstrap-admin] Таблицы analytics_events и admin_audit_logs готовы.",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[bootstrap-admin] Ошибка инициализации: ${message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}

