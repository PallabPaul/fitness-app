create table if not exists public.fasting_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  target_end_at timestamptz not null,
  ended_at timestamptz,
  fasting_hours integer not null check (fasting_hours between 1 and 23),
  eating_hours integer not null check (eating_hours between 1 and 23),
  created_at timestamptz not null default now(),
  check (target_end_at > started_at),
  check (ended_at is null or ended_at >= started_at)
);

insert into public.fasting_sessions (
  started_at, target_end_at, ended_at, fasting_hours, eating_hours
)
select
  last_meal_at,
  last_meal_at + make_interval(hours => fasting_hours),
  last_meal_at + make_interval(hours => fasting_hours),
  fasting_hours,
  eating_hours
from public.fasting_records
on conflict do nothing;

alter table public.fasting_sessions enable row level security;

create policy "personal fasting sessions"
on public.fasting_sessions
for all
to anon
using (true)
with check (true);