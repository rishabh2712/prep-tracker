create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  leetcode_target integer not null default 0,
  system_design_target integer not null default 0,
  target_date timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  is_shared boolean not null default false,
  title text not null,
  type text not null,
  tags_json jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  canonical_key text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_content_items_shared_canonical
  on public.content_items(canonical_key)
  where canonical_key is not null and is_shared = true;

create unique index if not exists idx_content_items_private_owner_canonical
  on public.content_items(owner_user_id, canonical_key)
  where canonical_key is not null and is_shared = false;

create index if not exists idx_content_items_type on public.content_items(type);
create index if not exists idx_content_items_owner on public.content_items(owner_user_id);

create table if not exists public.content_item_links (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  label text not null,
  url text not null
);

create index if not exists idx_content_item_links_item on public.content_item_links(content_item_id);

create table if not exists public.user_item_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  state text not null default 'ACTIVE',
  mastery text not null default 'MEDIUM',
  should_review_again boolean not null default true,
  review_interval_days integer not null default 7,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  deleted_at timestamptz,
  notes_markdown text not null default '',
  metadata_json jsonb not null default '{}'::jsonb,
  attempt_count integer,
  time_spent_minutes integer,
  confidence text,
  last_attempted_at timestamptz,
  leetcode_outcome text,
  last_solved_at timestamptz,
  solution_summary_markdown text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, content_item_id)
);

create index if not exists idx_user_item_state_due on public.user_item_state(user_id, next_review_at);
create index if not exists idx_user_item_state_content on public.user_item_state(content_item_id);

create table if not exists public.user_review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  goal_id uuid,
  outcome text not null,
  quality integer not null,
  notes_markdown text not null default '',
  previous_review_at timestamptz,
  next_review_at timestamptz not null,
  interval_before integer not null,
  interval_after integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_review_logs_user_created on public.user_review_logs(user_id, created_at desc);
create index if not exists idx_user_review_logs_item_created on public.user_review_logs(content_item_id, created_at desc);

create table if not exists public.user_change_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  action text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_change_logs_user_created on public.user_change_logs(user_id, created_at desc);

create table if not exists public.user_item_docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  content_markdown text not null default '',
  checksum text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, content_item_id)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  leetcode_target integer not null default 0,
  system_design_target integer not null default 0,
  daily_minutes_target integer not null default 120,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create index if not exists idx_goals_user on public.goals(user_id, updated_at desc);

create table if not exists public.goal_items (
  goal_id uuid not null references public.goals(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  module_kind text not null,
  selected_at timestamptz not null default timezone('utc', now()),
  primary key (goal_id, content_item_id)
);

create table if not exists public.goal_days (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  date date not null,
  status text not null default 'NOT_STARTED',
  planned_minutes integer not null default 0,
  actual_minutes integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (goal_id, date)
);

create table if not exists public.goal_day_entries (
  id uuid primary key default gen_random_uuid(),
  goal_day_id uuid not null references public.goal_days(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  item_type text not null,
  entry_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (goal_day_id, content_item_id, entry_type)
);

create table if not exists public.goal_targets (
  goal_id uuid not null references public.goals(id) on delete cascade,
  module_kind text not null,
  dimension text not null,
  bucket_key text not null,
  target_count integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (goal_id, module_kind, dimension, bucket_key)
);

create table if not exists public.goal_sessions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  module_kind text not null,
  action text not null,
  session_at timestamptz not null,
  minutes_spent integer not null default 0,
  notes_markdown text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_goal_sessions_goal_date on public.goal_sessions(goal_id, session_at desc);
create index if not exists idx_goal_sessions_item on public.goal_sessions(content_item_id, session_at desc);

alter table public.user_review_logs
  drop constraint if exists user_review_logs_goal_id_fkey;

alter table public.user_review_logs
  add constraint user_review_logs_goal_id_fkey
  foreign key (goal_id) references public.goals(id) on delete set null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (user_id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = timezone('utc', now());

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at before update on public.content_items
for each row execute procedure public.set_updated_at();

drop trigger if exists user_item_state_set_updated_at on public.user_item_state;
create trigger user_item_state_set_updated_at before update on public.user_item_state
for each row execute procedure public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals
for each row execute procedure public.set_updated_at();

drop trigger if exists goal_days_set_updated_at on public.goal_days;
create trigger goal_days_set_updated_at before update on public.goal_days
for each row execute procedure public.set_updated_at();

drop trigger if exists goal_targets_set_updated_at on public.goal_targets;
create trigger goal_targets_set_updated_at before update on public.goal_targets
for each row execute procedure public.set_updated_at();

drop trigger if exists goal_sessions_set_updated_at on public.goal_sessions;
create trigger goal_sessions_set_updated_at before update on public.goal_sessions
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.content_items enable row level security;
alter table public.content_item_links enable row level security;
alter table public.user_item_state enable row level security;
alter table public.user_review_logs enable row level security;
alter table public.user_change_logs enable row level security;
alter table public.user_item_docs enable row level security;
alter table public.goals enable row level security;
alter table public.goal_items enable row level security;
alter table public.goal_days enable row level security;
alter table public.goal_day_entries enable row level security;
alter table public.goal_targets enable row level security;
alter table public.goal_sessions enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_settings_select_own" on public.user_settings
for select using (auth.uid() = user_id);

create policy "user_settings_modify_own" on public.user_settings
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "content_items_select_accessible" on public.content_items
for select using (is_shared = true or owner_user_id = auth.uid());

create policy "content_items_insert_private" on public.content_items
for insert with check (owner_user_id = auth.uid() and is_shared = false);

create policy "content_items_update_private" on public.content_items
for update using (owner_user_id = auth.uid() and is_shared = false)
with check (owner_user_id = auth.uid() and is_shared = false);

create policy "content_items_delete_private" on public.content_items
for delete using (owner_user_id = auth.uid() and is_shared = false);

create policy "content_item_links_select_accessible" on public.content_item_links
for select using (
  exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_links.content_item_id
      and (ci.is_shared = true or ci.owner_user_id = auth.uid())
  )
);

create policy "content_item_links_modify_private" on public.content_item_links
for all using (
  exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_links.content_item_id
      and ci.owner_user_id = auth.uid()
      and ci.is_shared = false
  )
)
with check (
  exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_links.content_item_id
      and ci.owner_user_id = auth.uid()
      and ci.is_shared = false
  )
);

create policy "user_item_state_select_own" on public.user_item_state
for select using (auth.uid() = user_id);

create policy "user_item_state_modify_own" on public.user_item_state
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_review_logs_select_own" on public.user_review_logs
for select using (auth.uid() = user_id);

create policy "user_review_logs_modify_own" on public.user_review_logs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_change_logs_select_own" on public.user_change_logs
for select using (auth.uid() = user_id);

create policy "user_change_logs_insert_own" on public.user_change_logs
for insert with check (auth.uid() = user_id);

create policy "user_item_docs_select_own" on public.user_item_docs
for select using (auth.uid() = user_id);

create policy "user_item_docs_modify_own" on public.user_item_docs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "goals_select_own" on public.goals
for select using (auth.uid() = user_id);

create policy "goals_modify_own" on public.goals
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "goal_items_access_own_goal" on public.goal_items
for all using (
  exists (
    select 1 from public.goals g
    where g.id = goal_items.goal_id and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = goal_items.goal_id and g.user_id = auth.uid()
  )
);

create policy "goal_days_access_own_goal" on public.goal_days
for all using (
  exists (
    select 1 from public.goals g
    where g.id = goal_days.goal_id and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = goal_days.goal_id and g.user_id = auth.uid()
  )
);

create policy "goal_day_entries_access_own_goal" on public.goal_day_entries
for all using (
  exists (
    select 1 from public.goals g
    where g.id = goal_day_entries.goal_id and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = goal_day_entries.goal_id and g.user_id = auth.uid()
  )
);

create policy "goal_targets_access_own_goal" on public.goal_targets
for all using (
  exists (
    select 1 from public.goals g
    where g.id = goal_targets.goal_id and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = goal_targets.goal_id and g.user_id = auth.uid()
  )
);

create policy "goal_sessions_access_own_goal" on public.goal_sessions
for all using (
  exists (
    select 1 from public.goals g
    where g.id = goal_sessions.goal_id and g.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = goal_sessions.goal_id and g.user_id = auth.uid()
  )
);
