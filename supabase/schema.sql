-- A single private row per authenticated user stores that user's Chronos data.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"tasks": [], "appointments": [], "notes": []}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;
grant select, insert, update on public.user_data to authenticated;

create policy "Users can read their own Chronos data"
  on public.user_data for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own Chronos data"
  on public.user_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own Chronos data"
  on public.user_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
