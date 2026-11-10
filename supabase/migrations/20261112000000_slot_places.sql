-- 空き枠の場所を複数から選べるようにし、予約する人がその中から1つ選ぶ
-- slots.place（1つ）と slots.mode → slots.places（1〜4つ）
-- 予約で選んだ場所は bookings.place に残す。Zoom の URL は、Zoom を選んだ人にだけ見せる

-- 1. 枠：場所を配列に
alter table public.slots add column places public.meeting_place[];
update public.slots set places = array[place];
alter table public.slots
  alter column places set not null,
  add constraint slots_places_check check (cardinality(places) between 1 and 4 and array_position(places, null) is null);

-- 重複を除き、並びをそろえる（学食 → 図書館 → カフェ → Zoom）
create function private.normalize_slot_places() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.places := array(select distinct p from unnest(new.places) as p order by p);
  return new;
end $$;
create trigger slots_normalize_places before insert or update of places on public.slots
  for each row execute function private.normalize_slot_places();

-- 2. 予約：選んだ場所
alter table public.bookings add column place public.meeting_place;
update public.bookings b set place = s.place from public.slots s where s.id = b.slot_id;
alter table public.bookings alter column place set not null;

-- 3. Zoom の URL：枠に Zoom が含まれていれば登録でき、予約で Zoom を選んだ人だけが読める
drop policy "slot_secrets: 当事者が閲覧" on public.slot_secrets;
drop policy "slot_secrets: 話す人が登録" on public.slot_secrets;
create policy "slot_secrets: 当事者が閲覧" on public.slot_secrets
  for select to authenticated using (
    exists (select 1 from public.slots s where s.id = slot_id and s.teacher_id = auth.uid())
    or exists (
      select 1 from public.bookings b
       where b.slot_id = slot_secrets.slot_id and b.learner_id = auth.uid()
         and b.status <> 'cancelled' and b.place = 'zoom'
    )
  );
create policy "slot_secrets: 話す人が登録" on public.slot_secrets
  for insert to authenticated with check (
    exists (select 1 from public.slots s where s.id = slot_id and s.teacher_id = auth.uid() and 'zoom' = any (s.places))
  );

-- 4. 古い列を消す
alter table public.slots drop column mode, drop column place;

-- 5. 予約：場所を受け取る（枠の場所が1つなら省略できる）
drop function public.book_slot(uuid, uuid, text);
create function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_message text default null, p_place public.meeting_place default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_cfg     private.app_config;
  v_learner public.profiles;
  v_teacher public.profiles;
  v_slot    public.slots;
  v_offer   public.offers;
  v_place   public.meeting_place;
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
    raise exception 'プロフィールの登録と利用規約への同意を済ませてから予約してください';
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

  -- 場所：枠の候補の中から1つ。候補が1つなら、それに決まる
  if p_place is null then
    if cardinality(v_slot.places) <> 1 then
      raise exception '場所を選んでください';
    end if;
    v_place := v_slot.places[1];
  elsif p_place = any (v_slot.places) then
    v_place := p_place;
  else
    raise exception 'この枠では選べない場所です';
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

  if not private.gender_ok(v_uid, v_teacher.id) then
    raise exception '同性限定の設定により、この相手には申し込めません';
  end if;

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

  insert into public.bookings (slot_id, offer_id, learner_id, teacher_id, message, place, is_cross_field)
  values (
    v_slot.id, v_offer.id, v_uid, v_teacher.id, p_message, v_place,
    v_learner.faculty_id is distinct from v_teacher.faculty_id
      or v_learner.field_code is distinct from v_teacher.field_code
  )
  returning id into v_id;

  update public.slots set status = 'booked' where id = v_slot.id;
  perform private.apply_ledger(v_uid, -1, 'booking_hold', v_id);

  return v_id;
end $$;

revoke execute on function public.book_slot(uuid, uuid, text, public.meeting_place) from public, anon;
grant execute on function public.book_slot(uuid, uuid, text, public.meeting_place) to authenticated;
