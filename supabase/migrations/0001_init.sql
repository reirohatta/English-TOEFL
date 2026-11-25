-- reiro TOEFL Drill: 初期スキーマ
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行するか、`supabase db push` で適用する。
-- ルール: すべてのテーブルで RLS を有効にし、本人の行だけ読み書きできるようにする。

-- =========================================================
-- 1. テーブル
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  target_total numeric,
  target_reading numeric,
  target_listening numeric,
  target_writing numeric,
  target_speaking numeric,
  exam_date date,
  weekly_minutes int,
  weekly_sets int,
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null check (section in ('reading','listening','writing','speaking')),
  task text not null,
  difficulty text not null check (difficulty in ('easy','standard','hard')),
  topic text,
  official_style boolean not null default false,
  payload jsonb not null,
  status text not null default 'ready' check (status in ('ready','served')),
  created_at timestamptz not null default now()
);
create index if not exists items_user_task_status_idx on public.items (user_id, task, status, created_at desc);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  section text not null,
  task text not null,
  difficulty text not null,
  correct int,
  total int,
  band numeric check (band is null or (band >= 1 and band <= 6)),
  response jsonb,
  feedback jsonb,
  duration_sec int,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index if not exists attempts_user_section_idx on public.attempts (user_id, section, created_at desc);

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  question_index int not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mistakes_user_resolved_idx on public.mistakes (user_id, resolved, created_at desc);

create table if not exists public.vocab (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  meaning_ja text,
  example text,
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

-- =========================================================
-- 2. RLS（すべてのテーブル）
-- =========================================================
alter table public.profiles enable row level security;
alter table public.goals    enable row level security;
alter table public.items    enable row level security;
alter table public.attempts enable row level security;
alter table public.mistakes enable row level security;
alter table public.vocab    enable row level security;

-- profiles: 本人の行だけ読める・名前を更新できる（作成はトリガーで行う）
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- user_id を持つテーブル: 本人の行だけ読み書き
do $$
declare t text;
begin
  foreach t in array array['goals','items','attempts','mistakes','vocab'] loop
    execute format('drop policy if exists "%1$s_own" on public.%1$I', t);
    execute format(
      'create policy "%1$s_own" on public.%1$I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- =========================================================
-- 3. ドメイン制限 + profiles 自動作成
--    @reiro.co.jp 以外のユーザーは auth.users に作成させない（例外で OAuth を失敗させる）
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(split_part(new.email, '@', 2)) <> 'reiro.co.jp' then
    raise exception 'Only @reiro.co.jp accounts are allowed';
  end if;

  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row execute function public.handle_new_user();

-- メール変更で別ドメインに変えられないようにする
create or replace function public.prevent_email_domain_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email
     and (new.email is null or lower(split_part(new.email, '@', 2)) <> 'reiro.co.jp') then
    raise exception 'Only @reiro.co.jp accounts are allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  before update of email on auth.users
  for each row execute function public.prevent_email_domain_change();

-- =========================================================
-- 4. Storage
--    audio:      audio/{item_id}/{line}.mp3      … items の持ち主だけ読める（書き込みはサーバーの service role）
--    recordings: recordings/{user_id}/{...}      … 本人だけ読み書き
-- =========================================================
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false), ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "audio_read_own_items" on storage.objects;
create policy "audio_read_own_items" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audio'
    and exists (
      select 1 from public.items i
      where i.id::text = (storage.foldername(name))[1]
        and i.user_id = (select auth.uid())
    )
  );

drop policy if exists "recordings_select_own" on storage.objects;
create policy "recordings_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "recordings_insert_own" on storage.objects;
create policy "recordings_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "recordings_delete_own" on storage.objects;
create policy "recordings_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
