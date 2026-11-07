-- =====================================================================
-- Campus-Cross 初期スキーマ
--   - 学内ドメイン限定の登録
--   - チケット（トークン）: 初期3枚 / 毎月1枚（残高5枚未満のみ）/ 予約で仮押さえ
--   - オフィスアワー方式の予約（承認なしで即確定）
--   - 異分野セッションの記録
-- 残高とチケットの移動は private / security definer 関数でのみ行う。
-- =====================================================================

create extension if not exists btree_gist;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- 設定（検証中に数値を調整できるよう 1 行のテーブルにまとめる）
-- ---------------------------------------------------------------------
create table private.app_config (
  id                  boolean primary key default true check (id),
  initial_grant       int      not null default 3,
  monthly_grant       int      not null default 1,
  monthly_grant_cap   int      not null default 5,          -- この残高以上なら毎月の配布なし
  booking_lead_time   interval not null default '1 hour',   -- 予約の締め切り（開始の何時間前まで）
  auto_complete_after interval not null default '48 hours'  -- 終了からこの時間で自動完了
);
insert into private.app_config default values;

-- 登録を許可するメールドメイン（サブドメインも許可）
-- 例: insert into private.allowed_email_domains values ('example.ac.jp');
create table private.allowed_email_domains (
  domain text primary key check (domain = lower(domain) and domain like '%.%')
);

-- ---------------------------------------------------------------------
-- 分野マスタ
-- ---------------------------------------------------------------------
create table public.fields (
  code       text primary key,
  label      text not null,
  sort_order int  not null
);

insert into public.fields (code, label, sort_order) values
  ('science',        '理学',                 10),
  ('engineering',    '工学',                 20),
  ('informatics',    '情報',                 30),
  ('life_science',   '生命・農学',           40),
  ('medical',        '医療・薬学',           50),
  ('humanities',     '人文',                 60),
  ('social_science', '社会科学（法・経済・経営）', 70),
  ('education',      '教育',                 80),
  ('arts',           '芸術・デザイン',       90),
  ('other',          'その他',              100);

-- ---------------------------------------------------------------------
-- プロフィール
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 30),
  faculty      text check (char_length(faculty) <= 40),      -- 学部（自由入力）
  department   text check (char_length(department) <= 60),   -- 学科・専攻
  field_code   text references public.fields (code),
  grade        text check (grade in ('B1','B2','B3','B4','B5','B6','M1','M2','D1','D2','D3','other')),
  bio          text check (char_length(bio) <= 500),
  onboarded    boolean generated always as (display_name <> '' and field_code is not null) stored,
  is_admin     boolean not null default false,
  is_suspended boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 本人のみが見られる情報
create table public.profile_private (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  university_email text not null,
  contact_email    text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),  -- 通知先（普段使い）
  notify_by_email  boolean not null default true
);

-- ---------------------------------------------------------------------
-- チケット
-- ---------------------------------------------------------------------
create table public.wallets (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create type public.ledger_reason as enum (
  'signup_bonus',     -- 新規登録
  'monthly_grant',    -- 毎月の配布
  'booking_hold',     -- 予約時の仮押さえ（学ぶ側 −1）
  'booking_refund',   -- キャンセルによる返却（学ぶ側 +1）
  'teaching_reward',  -- 完了（教える側 +1）
  'admin_adjust'      -- 運営による調整
);

create table public.token_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount      int  not null check (amount <> 0),
  reason      public.ledger_reason not null,
  booking_id  uuid,
  grant_month date,
  note        text,
  created_at  timestamptz not null default now(),
  check ((reason = 'monthly_grant') = (grant_month is not null))
);

create unique index token_ledger_signup_once  on public.token_ledger (user_id) where reason = 'signup_bonus';
create unique index token_ledger_monthly_once on public.token_ledger (user_id, grant_month) where reason = 'monthly_grant';
create unique index token_ledger_booking_once on public.token_ledger (booking_id, reason) where booking_id is not null;
create index token_ledger_user_idx on public.token_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 募集カード
-- ---------------------------------------------------------------------
create table public.offers (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 5 and 60),       -- 問い形式
  hook         text not null check (char_length(hook) between 1 and 140),       -- 専門外の人へのひとこと
  description  text check (char_length(description) <= 1000),
  want_to_hear text check (char_length(want_to_hear) <= 140),                   -- あなたの分野から聞きたいこと
  field_code   text not null references public.fields (code),
  tags         text[] not null default '{}' check (cardinality(tags) <= 5),
  duration_min int  not null default 15 check (duration_min in (15, 30)),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index offers_field_idx   on public.offers (field_code) where is_active;
create index offers_teacher_idx on public.offers (teacher_id);
create index offers_tags_idx    on public.offers using gin (tags);

-- ---------------------------------------------------------------------
-- オフィスアワー枠
-- ---------------------------------------------------------------------
create type public.meeting_mode as enum ('in_person', 'online');
create type public.slot_status  as enum ('open', 'booked', 'cancelled');

create table public.slots (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  mode       public.meeting_mode not null default 'in_person',
  location   text not null check (char_length(location) between 1 and 100),
  status     public.slot_status not null default 'open',
  created_at timestamptz not null default now(),
  check (end_at > start_at and end_at - start_at <= interval '60 minutes'),
  -- 同じ教える人の枠は時間が重ならない
  constraint slots_no_overlap exclude using gist (
    teacher_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (status <> 'cancelled')
);

create index slots_open_idx on public.slots (start_at) where status = 'open';

-- ---------------------------------------------------------------------
-- 予約
-- ---------------------------------------------------------------------
create type public.booking_status as enum ('booked', 'completed', 'cancelled');

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  slot_id        uuid not null references public.slots (id),
  offer_id       uuid not null references public.offers (id),
  learner_id     uuid not null references public.profiles (id) on delete cascade,
  teacher_id     uuid not null references public.profiles (id) on delete cascade,
  status         public.booking_status not null default 'booked',
  message        text check (char_length(message) <= 300),        -- 学ぶ側のひとこと
  is_cross_field boolean not null,                                  -- 異分野セッションか
  thanks_message text check (char_length(thanks_message) <= 300),
  cancelled_by   uuid references public.profiles (id) on delete set null,
  cancel_reason  text check (char_length(cancel_reason) <= 200),
  auto_completed boolean not null default false,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  cancelled_at   timestamptz,
  check (learner_id <> teacher_id)
);

create unique index bookings_one_active_per_slot on public.bookings (slot_id) where status <> 'cancelled';
create index bookings_learner_idx on public.bookings (learner_id, created_at desc);
create index bookings_teacher_idx on public.bookings (teacher_id, created_at desc);

alter table public.token_ledger
  add constraint token_ledger_booking_fk foreign key (booking_id) references public.bookings (id) on delete set null;

-- ---------------------------------------------------------------------
-- 安全: ブロック・通報
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create type public.report_reason as enum ('solicitation', 'harassment', 'no_show', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved');

create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id     uuid references public.bookings (id) on delete set null,
  reason         public.report_reason not null,
  detail         text check (char_length(detail) <= 1000),
  status         public.report_status not null default 'open',
  created_at     timestamptz not null default now(),
  check (reporter_id <> target_user_id)
);

-- =====================================================================
-- 内部関数
-- =====================================================================

-- updated_at を自動更新
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger offers_touch before update on public.offers
  for each row execute function private.touch_updated_at();

-- 残高の増減と履歴の記録（必ずこの関数を経由する）
create function private.apply_ledger(
  p_user uuid, p_amount int, p_reason public.ledger_reason,
  p_booking uuid default null, p_month date default null, p_note text default null
) returns void
language plpgsql set search_path = '' as $$
begin
  update public.wallets
     set balance = balance + p_amount, updated_at = now()
   where user_id = p_user;
  if not found then
    raise exception 'wallet not found for %', p_user;
  end if;

  insert into public.token_ledger (user_id, amount, reason, booking_id, grant_month, note)
  values (p_user, p_amount, p_reason, p_booking, p_month, p_note);
end $$;

-- メールドメインが許可リストにあるか
create function private.is_allowed_email(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from private.allowed_email_domains d
     where split_part(lower(p_email), '@', 2) = d.domain
        or split_part(lower(p_email), '@', 2) like ('%.' || d.domain)
  )
$$;

-- 新規登録時: ドメインを確認し、プロフィール・財布・初期チケットを用意
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_grant int;
begin
  if new.email is null or not private.is_allowed_email(new.email) then
    raise exception '学内のメールアドレスでのみ登録できます' using errcode = 'P0001';
  end if;

  insert into public.profiles (id) values (new.id);
  insert into public.profile_private (user_id, university_email) values (new.id, lower(new.email));
  insert into public.wallets (user_id) values (new.id);

  select initial_grant into v_grant from private.app_config;
  perform private.apply_ledger(new.id, v_grant, 'signup_bonus');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- メールアドレスの変更時も学内ドメインに限定する
create function private.guard_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email
     and (new.email is null or not private.is_allowed_email(new.email)) then
    raise exception '学内のメールアドレス以外には変更できません' using errcode = 'P0001';
  end if;
  if new.email is distinct from old.email then
    update public.profile_private set university_email = lower(new.email) where user_id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_email_change before update of email on auth.users
  for each row execute function private.guard_email_change();

-- 予約の完了処理（手動・自動の共通部分）
create function private.finish_booking(p_booking_id uuid, p_thanks text, p_auto boolean)
returns void
language plpgsql set search_path = '' as $$
declare
  v_teacher uuid;
begin
  update public.bookings
     set status = 'completed',
         completed_at = now(),
         thanks_message = coalesce(p_thanks, thanks_message),
         auto_completed = p_auto
   where id = p_booking_id and status = 'booked'
  returning teacher_id into v_teacher;

  if v_teacher is null then
    raise exception 'この予約は完了にできません';
  end if;

  perform private.apply_ledger(v_teacher, 1, 'teaching_reward', p_booking_id);
end $$;

-- 定期実行: 終了から一定時間たった予約を自動で完了にする
create function private.auto_complete_bookings() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_after interval;
  v_id uuid;
  v_count int := 0;
begin
  select auto_complete_after into v_after from private.app_config;

  for v_id in
    select b.id
      from public.bookings b
      join public.slots s on s.id = b.slot_id
     where b.status = 'booked'
       and s.end_at < now() - v_after
     for update of b skip locked
  loop
    perform private.finish_booking(v_id, null, true);
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

-- =====================================================================
-- RPC（クライアントから呼ぶ関数）
-- =====================================================================

-- 枠を予約する（チケット1枚を仮押さえ）
create function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_message text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_cfg     private.app_config;
  v_learner public.profiles;
  v_teacher public.profiles;
  v_slot    public.slots;
  v_offer   public.offers;
  v_balance int;
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  select * into v_cfg from private.app_config;

  select * into v_learner from public.profiles where id = v_uid;
  if not found or v_learner.is_suspended then
    raise exception 'このアカウントでは予約できません';
  end if;
  if not v_learner.onboarded then
    raise exception 'プロフィール（表示名・分野）を登録してから予約してください';
  end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'open' then
    raise exception 'この枠は予約できません';
  end if;
  if v_slot.teacher_id = v_uid then
    raise exception '自分の枠は予約できません';
  end if;
  if v_slot.start_at <= now() + v_cfg.booking_lead_time then
    raise exception '予約の締め切りを過ぎた枠です';
  end if;

  select * into v_offer from public.offers where id = p_offer_id;
  if not found or not v_offer.is_active or v_offer.teacher_id <> v_slot.teacher_id then
    raise exception 'この募集には予約できません';
  end if;
  if v_slot.end_at - v_slot.start_at < make_interval(mins => v_offer.duration_min) then
    raise exception 'この枠ではテーマの時間が足りません';
  end if;

  select * into v_teacher from public.profiles where id = v_slot.teacher_id;
  if v_teacher.is_suspended then
    raise exception 'この相手には現在予約できません';
  end if;

  if exists (
    select 1 from public.blocks
     where (blocker_id = v_uid and blocked_id = v_teacher.id)
        or (blocker_id = v_teacher.id and blocked_id = v_uid)
  ) then
    raise exception 'この相手には予約できません';
  end if;

  -- 自分が同じ時間帯に別の予約（学ぶ・教える）を持っていないか
  if exists (
    select 1
      from public.bookings b
      join public.slots s on s.id = b.slot_id
     where b.status = 'booked'
       and (b.learner_id = v_uid or b.teacher_id = v_uid)
       and tstzrange(s.start_at, s.end_at) && tstzrange(v_slot.start_at, v_slot.end_at)
  ) then
    raise exception '同じ時間帯に別の予約があります';
  end if;

  select balance into v_balance from public.wallets where user_id = v_uid for update;
  if v_balance < 1 then
    raise exception 'チケットが足りません';
  end if;

  insert into public.bookings (slot_id, offer_id, learner_id, teacher_id, message, is_cross_field)
  values (
    v_slot.id, v_offer.id, v_uid, v_teacher.id, p_message,
    v_learner.field_code is distinct from v_teacher.field_code
  )
  returning id into v_id;

  update public.slots set status = 'booked' where id = v_slot.id;
  perform private.apply_ledger(v_uid, -1, 'booking_hold', v_id);

  return v_id;
end $$;

-- 予約をキャンセルする（学ぶ側に返却）
create function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_booking public.bookings;
  v_slot    public.slots;
  v_by_learner boolean;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_uid is null or v_uid not in (v_booking.learner_id, v_booking.teacher_id) then
    raise exception '予約が見つかりません';
  end if;
  if v_booking.status <> 'booked' then
    raise exception 'この予約はキャンセルできません';
  end if;

  select * into v_slot from public.slots where id = v_booking.slot_id for update;
  v_by_learner := (v_uid = v_booking.learner_id);

  if v_by_learner and v_slot.start_at <= now() then
    raise exception '開始時刻を過ぎた予約はキャンセルできません。問題があれば通報してください';
  end if;

  update public.bookings
     set status = 'cancelled', cancelled_by = v_uid, cancel_reason = p_reason, cancelled_at = now()
   where id = v_booking.id;

  -- 学ぶ側のキャンセルなら枠を戻す。教える側のキャンセルなら枠も取り消す
  update public.slots
     set status = case when v_by_learner then 'open'::public.slot_status
                       else 'cancelled'::public.slot_status end
   where id = v_slot.id;

  perform private.apply_ledger(v_booking.learner_id, 1, 'booking_refund', v_booking.id);
end $$;

-- セッションを完了にする（学ぶ側のみ・開始後）
create function public.complete_booking(p_booking_id uuid, p_thanks text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_booking public.bookings;
  v_start   timestamptz;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_uid is null or v_uid <> v_booking.learner_id then
    raise exception '予約が見つかりません';
  end if;
  if v_booking.status <> 'booked' then
    raise exception 'この予約は完了にできません';
  end if;

  select start_at into v_start from public.slots where id = v_booking.slot_id;
  if v_start > now() then
    raise exception '開始時刻より前に完了にはできません';
  end if;

  perform private.finish_booking(v_booking.id, p_thanks, false);
end $$;

-- 完了後にお礼コメントを送る（自動完了した予約など）
create function public.send_thanks(p_booking_id uuid, p_thanks text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings
     set thanks_message = p_thanks
   where id = p_booking_id
     and learner_id = auth.uid()
     and status = 'completed'
     and thanks_message is null;
  if not found then
    raise exception 'お礼コメントを送れる予約が見つかりません';
  end if;
end $$;

-- 毎月の配布を受け取る（ログイン時に呼ぶ。何度呼んでも月1回）
create function public.claim_monthly_grant()
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_cfg     private.app_config;
  v_month   date := date_trunc('month', now() at time zone 'Asia/Tokyo')::date;
  v_profile public.profiles;
  v_balance int;
  v_amount  int;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  select * into v_cfg from private.app_config;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.is_suspended then
    return 0;
  end if;
  -- 登録した月は初期付与があるので対象外
  if date_trunc('month', v_profile.created_at at time zone 'Asia/Tokyo')::date = v_month then
    return 0;
  end if;

  select balance into v_balance from public.wallets where user_id = v_uid for update;
  if v_balance >= v_cfg.monthly_grant_cap then
    return 0;
  end if;
  if exists (
    select 1 from public.token_ledger
     where user_id = v_uid and reason = 'monthly_grant' and grant_month = v_month
  ) then
    return 0;
  end if;

  v_amount := least(v_cfg.monthly_grant, v_cfg.monthly_grant_cap - v_balance);
  perform private.apply_ledger(v_uid, v_amount, 'monthly_grant', null, v_month);
  return v_amount;
end $$;

-- 実行権限: ログインユーザーのみ
revoke execute on function public.book_slot(uuid, uuid, text)       from public, anon;
revoke execute on function public.cancel_booking(uuid, text)        from public, anon;
revoke execute on function public.complete_booking(uuid, text)      from public, anon;
revoke execute on function public.send_thanks(uuid, text)           from public, anon;
revoke execute on function public.claim_monthly_grant()             from public, anon;
grant  execute on function public.book_slot(uuid, uuid, text)       to authenticated;
grant  execute on function public.cancel_booking(uuid, text)        to authenticated;
grant  execute on function public.complete_booking(uuid, text)      to authenticated;
grant  execute on function public.send_thanks(uuid, text)           to authenticated;
grant  execute on function public.claim_monthly_grant()             to authenticated;

-- =====================================================================
-- RLS（行レベルセキュリティ）
--   すべて「ログイン済み（authenticated）」のみ。学外には一切見せない。
-- =====================================================================
alter table public.fields          enable row level security;
alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.wallets         enable row level security;
alter table public.token_ledger    enable row level security;
alter table public.offers          enable row level security;
alter table public.slots           enable row level security;
alter table public.bookings        enable row level security;
alter table public.blocks          enable row level security;
alter table public.reports         enable row level security;

-- 匿名ユーザーには何も見せない
revoke all on all tables in schema public from anon;

-- fields
create policy "fields: 誰でも閲覧" on public.fields
  for select to authenticated using (true);

-- profiles: 全員が閲覧、本人のみ一部の列を更新
create policy "profiles: 閲覧" on public.profiles
  for select to authenticated using (true);
create policy "profiles: 本人が更新" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, faculty, department, field_code, grade, bio) on public.profiles to authenticated;

-- profile_private: 本人のみ
create policy "profile_private: 本人が閲覧" on public.profile_private
  for select to authenticated using (user_id = auth.uid());
create policy "profile_private: 本人が更新" on public.profile_private
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.profile_private from authenticated;
grant update (contact_email, notify_by_email) on public.profile_private to authenticated;

-- wallets / token_ledger: 本人のみ閲覧。書き込みは関数経由のみ
create policy "wallets: 本人が閲覧" on public.wallets
  for select to authenticated using (user_id = auth.uid());
create policy "token_ledger: 本人が閲覧" on public.token_ledger
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.wallets      from authenticated;
revoke insert, update, delete on public.token_ledger from authenticated;

-- offers: 公開中のものは全員、自分のものは常に閲覧。作成・編集は本人（プロフィール登録済み・停止中でない）
create policy "offers: 閲覧" on public.offers
  for select to authenticated using (
    is_active
    or teacher_id = auth.uid()
    or exists (select 1 from public.bookings b
                where b.offer_id = offers.id and b.learner_id = auth.uid())
  );
create policy "offers: 本人が作成" on public.offers
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.onboarded and not p.is_suspended)
  );
create policy "offers: 本人が更新" on public.offers
  for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "offers: 本人が削除" on public.offers
  for delete to authenticated using (teacher_id = auth.uid());

-- slots: 全員が閲覧。作成は本人（未来の枠のみ）。更新・削除は予約が入っていない枠のみ
create policy "slots: 閲覧" on public.slots
  for select to authenticated using (true);
create policy "slots: 本人が作成" on public.slots
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and status = 'open'
    and start_at > now()
    and exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.onboarded and not p.is_suspended)
  );
create policy "slots: 本人が更新（未予約のみ）" on public.slots
  for update to authenticated
  using (teacher_id = auth.uid() and status = 'open')
  with check (teacher_id = auth.uid() and status in ('open', 'cancelled'));
create policy "slots: 本人が削除（未予約のみ）" on public.slots
  for delete to authenticated using (teacher_id = auth.uid() and status = 'open');

-- bookings: 当事者のみ閲覧。書き込みは関数経由のみ
create policy "bookings: 当事者が閲覧" on public.bookings
  for select to authenticated using (auth.uid() in (learner_id, teacher_id));
revoke insert, update, delete on public.bookings from authenticated;

-- blocks: 本人のみ
create policy "blocks: 本人が閲覧" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: 本人が作成" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: 本人が削除" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- reports: 本人が作成・閲覧（対応は運営がダッシュボードで行う）
create policy "reports: 本人が閲覧" on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy "reports: 本人が作成" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open');
revoke update, delete on public.reports from authenticated;

-- =====================================================================
-- KPI（運営がSQLエディタで見る用。private スキーマなので API には出ない）
-- =====================================================================
create view private.kpi_weekly as
select
  date_trunc('week', s.start_at at time zone 'Asia/Tokyo')::date as week,
  count(*) filter (where b.status = 'completed')                                  as completed_sessions,
  count(*) filter (where b.status = 'completed' and b.is_cross_field)             as cross_field_sessions,
  round(100.0 * count(*) filter (where b.status = 'completed' and b.is_cross_field)
        / nullif(count(*) filter (where b.status = 'completed'), 0), 1)           as cross_field_pct,
  count(*) filter (where b.status = 'cancelled')                                  as cancelled,
  round(100.0 * count(*) filter (where b.status = 'cancelled') / nullif(count(*), 0), 1) as cancel_pct,
  count(*) filter (where b.status = 'completed' and b.thanks_message is not null) as with_thanks
from public.bookings b
join public.slots s on s.id = b.slot_id
group by 1
order by 1;

-- =====================================================================
-- 定期実行（pg_cron が有効な場合のみ登録する）
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('campus-cross-auto-complete', '7 * * * *',
                          'select private.auto_complete_bookings()');
  end if;
end $$;
