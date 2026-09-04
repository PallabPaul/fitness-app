create table if not exists public.fasting_records (
  fast_date date primary key,
  last_meal_at timestamptz not null,
  fasting_hours integer not null check (fasting_hours between 1 and 23),
  eating_hours integer not null check (eating_hours between 1 and 23),
  created_at timestamptz not null default now()
);

alter table public.fasting_records enable row level security;

create policy "personal fasting records"
on public.fasting_records
for all
to anon
using (true)
with check (true);