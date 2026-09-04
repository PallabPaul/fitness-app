create extension if not exists pgcrypto;

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  calories integer not null check (calories >= 0),
  protein integer not null default 0 check (protein >= 0),
  carbs integer not null default 0 check (carbs >= 0),
  fat integer not null default 0 check (fat >= 0),
  eaten_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('Running', 'Weights', 'Walking', 'Other')),
  name text not null,
  duration integer not null check (duration > 0),
  distance numeric check (distance is null or distance >= 0),
  notes text,
  calories_burned integer not null default 0 check (calories_burned >= 0),
  completed_at timestamptz not null default now()
);

alter table public.workouts add column if not exists calories_burned integer not null default 0 check (calories_burned >= 0);

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  weight numeric not null check (weight between 20 and 500),
  recorded_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id integer primary key default 1 check (id = 1),
  weight_lb numeric not null default 195,
  height_ft integer not null default 5,
  height_in integer not null default 11,
  age integer not null default 30,
  sex text not null default 'male' check (sex in ('male', 'female')),
  activity text not null default 'light' check (activity in ('sedentary', 'light', 'moderate', 'active')),
  weekly_loss_lb numeric not null default 1.5 check (weekly_loss_lb in (0.5, 1, 1.5)),
  goal_calories integer check (goal_calories is null or goal_calories >= 1000),
  macro_protein integer check (macro_protein is null or macro_protein >= 0),
  macro_carbs integer check (macro_carbs is null or macro_carbs >= 0),
  macro_fat integer check (macro_fat is null or macro_fat >= 0)
);

alter table public.profiles add column if not exists goal_calories integer check (goal_calories is null or goal_calories >= 1000);
alter table public.profiles add column if not exists macro_protein integer check (macro_protein is null or macro_protein >= 0);
alter table public.profiles add column if not exists macro_carbs integer check (macro_carbs is null or macro_carbs >= 0);
alter table public.profiles add column if not exists macro_fat integer check (macro_fat is null or macro_fat >= 0);

alter table public.meals enable row level security;
alter table public.workouts enable row level security;
alter table public.weight_entries enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "personal meals" on public.meals;
drop policy if exists "personal workouts" on public.workouts;
drop policy if exists "personal weights" on public.weight_entries;
drop policy if exists "personal profile" on public.profiles;

create policy "personal meals" on public.meals for all to anon using (true) with check (true);
create policy "personal workouts" on public.workouts for all to anon using (true) with check (true);
create policy "personal weights" on public.weight_entries for all to anon using (true) with check (true);
create policy "personal profile" on public.profiles for all to anon using (true) with check (true);
