-- 延期の提案
-- 予約が入った日に都合が悪くなったら、話す人が別の日時を1〜3つ提案する。
-- 候補は「自分の空き枠」か「新しい日時」。予約した人が1つ選ぶと予約がその日時に移り、
-- どれも合わなければ予約を取り消してチケットを戻す。元の開始時刻までに返事がなければ、自動で取り消して戻す。

create type public.reschedule_status as enum ('pending', 'accepted', 'declined', 'expired', 'withdrawn');

create table public.reschedule_proposals (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings (id) on delete cascade,
  proposed_by   uuid not null references public.profiles (id) on delete cascade,
  message       text check (char_length(message) <= 300),
  status        public.reschedule_status not null default 'pending',
  expires_at    timestamptz not null,           -- 元の開始時刻。これを過ぎたら自動で取り消す
  chosen_option uuid,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);
create unique index reschedule_one_pending on public.reschedule_proposals (booking_id) where status = 'pending';
create index reschedule_pending_expiry on public.reschedule_proposals (expires_at) where status = 'pending';

create table public.reschedule_options (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.reschedule_proposals (id) on delete cascade,
  slot_id     uuid references public.slots (id) on delete set null,  -- 自分の空き枠から選んだとき
  start_at    timestamptz not null,
  end_at      timestamptz not null check (end_at > start_at)
);
create index reschedule_options_proposal on public.reschedule_options (proposal_id, start_at);

create trigger reschedule_no_contact before insert or update of message on public.reschedule_proposals
  for each row execute function private.reject_contact_info('message');

alter table public.reschedule_proposals enable row level security;
alter table public.reschedule_options enable row level security;
create policy "reschedule_proposals: 当事者が閲覧" on public.reschedule_proposals
  for select to authenticated using (
    exists (select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.learner_id, b.teacher_id))
  );
create policy "reschedule_options: 当事者が閲覧" on public.reschedule_options
  for select to authenticated using (
    exists (select 1 from public.reschedule_proposals r join public.bookings b on b.id = r.booking_id
             where r.id = proposal_id and auth.uid() in (b.learner_id, b.teacher_id))
  );
revoke all on public.reschedule_proposals, public.reschedule_options from anon;
revoke insert, update, delete on public.reschedule_proposals, public.reschedule_options from authenticated;

-- 予約が取り消し・完了になったら、回答待ちの提案は取り下げ扱いにする
create function private.close_reschedule_on_booking_end() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'booked' and old.status = 'booked' then
    update public.reschedule_proposals
       set status = 'withdrawn', responded_at = now()
     where booking_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
create trigger bookings_close_reschedule after update of status on public.bookings
  for each row execute function private.close_reschedule_on_booking_end();

-- 回答待ちの提案がある予約は、完了にできない（元の時間には会わないため）
create function private.block_complete_while_rescheduling() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' and old.status = 'booked'
     and exists (select 1 from public.reschedule_proposals where booking_id = new.id and status = 'pending') then
    raise exception '延期の提案に返事をしてから完了にしてください';
  end if;
  return new;
end $$;
create trigger bookings_block_complete before update of status on public.bookings
  for each row execute function private.block_complete_while_rescheduling();

-- 話す人が延期を提案する。p_slot_ids は自分の空き枠、p_starts は新しい日時（長さは元の枠と同じ）。合わせて1〜3つ
create function public.propose_reschedule(p_booking_id uuid, p_slot_ids uuid[], p_starts timestamptz[], p_message text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_cfg     private.app_config;
  v_booking public.bookings;
  v_slot    public.slots;
  v_len     interval;
  v_id      uuid;
  v_sid     uuid;
  v_start   timestamptz;
  v_opt     public.slots;
  v_n       int := coalesce(cardinality(p_slot_ids), 0) + coalesce(cardinality(p_starts), 0);
begin
  select * into v_cfg from private.app_config;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_uid is null or v_uid <> v_booking.teacher_id then
    raise exception '予約が見つかりません';
  end if;
  if v_booking.status <> 'booked' then raise exception 'この予約は延期できません'; end if;
  if exists (select 1 from public.reschedule_proposals where booking_id = p_booking_id and status = 'pending') then
    raise exception 'すでに延期を提案しています。相手の返事をお待ちください';
  end if;
  if v_n < 1 or v_n > 3 then raise exception '候補は1〜3つにしてください'; end if;
  if char_length(coalesce(p_message, '')) > 300 then raise exception 'ひとことは300文字以内にしてください'; end if;

  select * into v_slot from public.slots where id = v_booking.slot_id;
  if v_slot.start_at <= now() then raise exception '開始時刻を過ぎた予約は延期できません'; end if;
  v_len := v_slot.end_at - v_slot.start_at;

  insert into public.reschedule_proposals (booking_id, proposed_by, message, expires_at)
  values (p_booking_id, v_uid, nullif(trim(p_message), ''), v_slot.start_at)
  returning id into v_id;

  -- 自分の空き枠から
  foreach v_sid in array coalesce(p_slot_ids, '{}') loop
    select * into v_opt from public.slots where id = v_sid;
    if not found or v_opt.teacher_id <> v_uid or v_opt.status <> 'open' or v_opt.id = v_slot.id then
      raise exception '選んだ空き枠は使えません';
    end if;
    if v_opt.start_at <= now() + v_cfg.booking_lead_time then raise exception '候補は1時間以上先の日時にしてください'; end if;
    if not (v_booking.place = any (v_opt.places)) then
      raise exception '予約で選ばれた場所が含まれていない空き枠は選べません';
    end if;
    if v_opt.end_at - v_opt.start_at < v_len then raise exception '元の予約より短い空き枠は選べません'; end if;
    insert into public.reschedule_options (proposal_id, slot_id, start_at, end_at)
    values (v_id, v_opt.id, v_opt.start_at, v_opt.start_at + v_len);
  end loop;

  -- 新しい日時
  foreach v_start in array coalesce(p_starts, '{}') loop
    if v_start <= now() + v_cfg.booking_lead_time then raise exception '候補は1時間以上先の日時にしてください'; end if;
    if exists (
      select 1 from public.slots s
       where s.teacher_id = v_uid and s.status <> 'cancelled' and s.id <> v_slot.id
         and tstzrange(s.start_at, s.end_at) && tstzrange(v_start, v_start + v_len)
    ) then
      raise exception 'ほかの枠と重なる日時があります（空き枠の場合は「自分の空き枠」から選んでください）';
    end if;
    insert into public.reschedule_options (proposal_id, start_at, end_at) values (v_id, v_start, v_start + v_len);
  end loop;

  return v_id;
end $$;

-- 予約した人が候補を1つ選ぶ。予約をその日時に移し、元の枠は取り消す
create function public.accept_reschedule(p_proposal_id uuid, p_option_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_prop    public.reschedule_proposals;
  v_booking public.bookings;
  v_old     public.slots;
  v_opt     public.reschedule_options;
  v_new     uuid;
  v_status  public.slot_status;
begin
  select * into v_prop from public.reschedule_proposals where id = p_proposal_id for update;
  if not found then raise exception '提案が見つかりません'; end if;
  select * into v_booking from public.bookings where id = v_prop.booking_id for update;
  if v_uid is null or v_uid <> v_booking.learner_id then raise exception '提案が見つかりません'; end if;
  if v_prop.status <> 'pending' or v_booking.status <> 'booked' then raise exception 'この提案にはもう返事ができません'; end if;
  if v_prop.expires_at <= now() then raise exception '返事の期限（元の開始時刻）を過ぎました'; end if;

  select * into v_opt from public.reschedule_options where id = p_option_id and proposal_id = p_proposal_id;
  if not found then raise exception '候補が見つかりません'; end if;
  if v_opt.start_at <= now() then raise exception 'この候補の日時は過ぎています。ほかの候補を選んでください'; end if;

  -- 学ぶ人の、同じ時間帯のほかの予約
  if exists (
    select 1 from public.bookings b join public.slots s on s.id = b.slot_id
     where b.status = 'booked' and b.id <> v_booking.id and (b.learner_id = v_uid or b.teacher_id = v_uid)
       and tstzrange(s.start_at, s.end_at) && tstzrange(v_opt.start_at, v_opt.end_at)
  ) then
    raise exception 'この日時には、あなたの別の予約があります';
  end if;

  select * into v_old from public.slots where id = v_booking.slot_id for update;

  if v_opt.slot_id is not null then
    -- 話す人の空き枠を使う
    select status into v_status from public.slots where id = v_opt.slot_id for update;
    if v_status is distinct from 'open' then
      raise exception 'この空き枠は、ほかの人の予約で埋まってしまいました。ほかの候補を選んでください';
    end if;
    update public.slots set status = 'booked' where id = v_opt.slot_id;
    v_new := v_opt.slot_id;
  else
    -- 新しい日時の枠をつくる（場所と目印は元の枠と同じ）
    begin
      insert into public.slots (teacher_id, start_at, end_at, places, place_note, status)
      values (v_old.teacher_id, v_opt.start_at, v_opt.end_at, v_old.places, v_old.place_note, 'booked')
      returning id into v_new;
    exception when exclusion_violation then
      raise exception 'この日時は、話す人のほかの予定と重なってしまいました。ほかの候補を選んでください';
    end;
    insert into public.slot_secrets (slot_id, meeting_url)
    select v_new, meeting_url from public.slot_secrets where slot_id = v_old.id
    on conflict do nothing;
  end if;

  -- 元の枠は、話す人の都合が悪い時間なので取り消す
  update public.slots set status = 'cancelled' where id = v_old.id;
  update public.bookings set slot_id = v_new where id = v_booking.id;
  update public.reschedule_proposals
     set status = 'accepted', chosen_option = p_option_id, responded_at = now()
   where id = p_proposal_id;
end $$;

-- 予約した人が、どの候補も合わないと返事する。予約を取り消してチケットを戻す
create function public.decline_reschedule(p_proposal_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_prop    public.reschedule_proposals;
  v_booking public.bookings;
begin
  select * into v_prop from public.reschedule_proposals where id = p_proposal_id for update;
  if not found then raise exception '提案が見つかりません'; end if;
  select * into v_booking from public.bookings where id = v_prop.booking_id for update;
  if v_uid is null or v_uid <> v_booking.learner_id then raise exception '提案が見つかりません'; end if;
  if v_prop.status <> 'pending' or v_booking.status <> 'booked' then raise exception 'この提案にはもう返事ができません'; end if;

  update public.reschedule_proposals set status = 'declined', responded_at = now() where id = p_proposal_id;
  update public.bookings
     set status = 'cancelled', cancelled_by = v_uid, cancel_reason = '延期の候補に合う日時がありませんでした', cancelled_at = now()
   where id = v_booking.id;
  update public.slots set status = 'cancelled' where id = v_booking.slot_id;
  perform private.apply_ledger(v_booking.learner_id, 1, 'booking_refund', v_booking.id);
end $$;

-- 返事がないまま元の開始時刻を過ぎた提案は、予約を取り消してチケットを戻す
create function private.expire_reschedules() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_prop  public.reschedule_proposals;
  v_count int := 0;
begin
  for v_prop in
    select * from public.reschedule_proposals where status = 'pending' and expires_at <= now() for update skip locked
  loop
    update public.reschedule_proposals set status = 'expired', responded_at = now() where id = v_prop.id;
    perform private.system_cancel_booking(v_prop.booking_id, '延期の提案に返事がないまま、元の日時を過ぎました');
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- 自動完了の前に期限切れの提案を片付け、回答待ちの予約は自動完了しない
create or replace function private.auto_complete_bookings() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_after interval;
  v_id uuid;
  v_count int := 0;
begin
  perform private.expire_reschedules();
  select auto_complete_after into v_after from private.app_config;

  for v_id in
    select b.id
      from public.bookings b
      join public.slots s on s.id = b.slot_id
     where b.status = 'booked'
       and s.end_at < now() - v_after
       and not exists (select 1 from public.reschedule_proposals r where r.booking_id = b.id and r.status = 'pending')
     for update of b skip locked
  loop
    perform private.finish_booking(v_id, null, true);
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

revoke execute on function public.propose_reschedule(uuid, uuid[], timestamptz[], text) from public, anon;
revoke execute on function public.accept_reschedule(uuid, uuid) from public, anon;
revoke execute on function public.decline_reschedule(uuid) from public, anon;
grant execute on function public.propose_reschedule(uuid, uuid[], timestamptz[], text) to authenticated;
grant execute on function public.accept_reschedule(uuid, uuid) to authenticated;
grant execute on function public.decline_reschedule(uuid) to authenticated;
