create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.goal_completions (
  goal_id uuid not null references public.daily_goals(id) on delete cascade,
  completed_on date not null,
  primary key (goal_id, completed_on)
);

create table if not exists public.fasting_settings (
  id integer primary key default 1 check (id = 1),
  fasting_hours integer not null default 16 check (fasting_hours between 1 and 23),
  eating_hours integer not null default 8 check (eating_hours between 1 and 23),
  last_meal_at timestamptz
);

alter table public.daily_goals enable row level security;
alter table public.goal_completions enable row level security;
alter table public.fasting_settings enable row level security;

create policy "personal daily goals" on public.daily_goals for all to anon using (true) with check (true);
create policy "personal goal completions" on public.goal_completions for all to anon using (true) with check (true);
create policy "personal fasting settings" on public.fasting_settings for all to anon using (true) with check (true);