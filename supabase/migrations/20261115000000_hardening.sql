-- 公開前の見直し（脆弱性の修正）
-- 1. 通報は「一緒に予約した相手」にだけできるようにする（API を直接たたいて誰でも自動停止にできた）
-- 2. 書き込める列を、アプリが使う列だけに絞る（作成日時のごまかし・他人の毎週の枠の妨害などを防ぐ）
-- 3. 他の利用者から、停止・凍結の状態や運営の権限・規約の同意日時が見えないようにする
-- 4. 毎週のオフィスアワーとカードの数に上限を設ける（大量登録の防止）
-- 5. 使わない権限（TRUNCATE など）を外す

-- ---------------------------------------------------------------------
-- 1. 通報：一緒に予約した相手にだけ
-- ---------------------------------------------------------------------
drop policy "reports: 本人が作成" on public.reports;
create policy "reports: 本人が作成" on public.reports
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and status = 'open'
    and source = 'report'
    and booking_id is not null
    and exists (
      select 1 from public.bookings b
       where b.id = booking_id
         and ((b.learner_id = auth.uid() and b.teacher_id = target_user_id)
           or (b.teacher_id = auth.uid() and b.learner_id = target_user_id))
    )
  );
revoke insert on public.reports from authenticated;
grant insert (reporter_id, target_user_id, booking_id, reason, detail) on public.reports to authenticated;

-- ---------------------------------------------------------------------
-- 2. 書き込める列を絞る
-- ---------------------------------------------------------------------
-- カード：作成日時・ID・持ち主は書き換えられない
revoke insert, update on public.offers from authenticated;
grant insert (teacher_id, kind, title, hook, description, want_to_hear, field_code, tags, duration_min, is_active) on public.offers to authenticated;
grant update (kind, title, hook, description, want_to_hear, field_code, tags, duration_min, is_active) on public.offers to authenticated;

-- 空き枠：毎週の登録とのつながり（weekly_hour_id）や日時は、作成後に書き換えられない。変えられるのは状態（取り消し）だけ
revoke insert, update on public.slots from authenticated;
grant insert (teacher_id, start_at, end_at, places, place_note) on public.slots to authenticated;
grant update (status) on public.slots to authenticated;

-- ブロック・Zoom の URL
revoke insert, update on public.blocks from authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
revoke insert, update on public.slot_secrets from authenticated;
grant insert (slot_id, meeting_url) on public.slot_secrets to authenticated;
grant update (meeting_url) on public.slot_secrets to authenticated;
revoke insert on public.weekly_hours from authenticated;
grant insert (teacher_id, weekday, start_time, minutes, places, place_note) on public.weekly_hours to authenticated;
revoke insert on public.weekly_hour_secrets from authenticated;
grant insert (weekly_hour_id, meeting_url) on public.weekly_hour_secrets to authenticated;

-- マスタは読むだけ
revoke insert, update, delete on public.fields, public.faculties from authenticated;

-- 使わない権限（PostgREST からは使えないが、念のため）
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from authenticated, anon', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. 他の利用者から見えるプロフィールの列を絞る
--    停止・凍結の状態、運営の権限、規約の同意は、本人（my_profile）と運営（admin_profiles）だけが読める
-- ---------------------------------------------------------------------
-- RLS のポリシーは呼び出した人の権限で動くため、停止中かどうかの判定は関数に任せる
create function public.i_can_post() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select onboarded and not is_suspended from public.profiles where id = auth.uid()), false)
$$;
revoke execute on function public.i_can_post() from public, anon;
grant execute on function public.i_can_post() to authenticated;

drop policy "offers: 本人が作成" on public.offers;
create policy "offers: 本人が作成" on public.offers
  for insert to authenticated with check (teacher_id = auth.uid() and public.i_can_post());
drop policy "slots: 本人が作成" on public.slots;
create policy "slots: 本人が作成" on public.slots
  for insert to authenticated with check (teacher_id = auth.uid() and status = 'open' and start_at > now() and public.i_can_post());
drop policy "weekly_hours: 本人が作成" on public.weekly_hours;
create policy "weekly_hours: 本人が作成" on public.weekly_hours
  for insert to authenticated with check (teacher_id = auth.uid() and public.i_can_post());

-- 停止中の人のカードを隠すための印（停止中の人のカードは本人以外に見えないので、印から状態は分からない）
alter table public.offers add column teacher_suspended boolean not null default false;
update public.offers o set teacher_suspended = p.is_suspended from public.profiles p where p.id = o.teacher_id;
create function private.sync_offer_suspension() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_suspended is distinct from old.is_suspended then
    update public.offers set teacher_suspended = new.is_suspended where teacher_id = new.id;
  end if;
  return new;
end $$;
-- is_suspended は moderation_status から別のトリガーで決まるので、列を限定せずに受ける
create trigger profiles_sync_offer_suspension after update on public.profiles
  for each row execute function private.sync_offer_suspension();
create function private.set_offer_suspension() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.teacher_suspended := coalesce((select is_suspended from public.profiles where id = new.teacher_id), false);
  return new;
end $$;
create trigger offers_set_suspension before insert on public.offers
  for each row execute function private.set_offer_suspension();

drop policy "offers: 閲覧" on public.offers;
create policy "offers: 閲覧" on public.offers
  for select to authenticated using (
    teacher_id = auth.uid()
    or exists (select 1 from public.bookings b where b.offer_id = offers.id and b.learner_id = auth.uid())
    or (is_active and not teacher_suspended)
  );

revoke select on public.profiles from authenticated;
grant select (id, display_name, faculty_id, field_code, grade, bio, same_gender_only, onboarded, is_official, created_at, updated_at)
  on public.profiles to authenticated;

-- 本人のプロフィール（すべての列）
create function public.my_profile() returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = auth.uid()
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 運営用：指定した人、または指定がなければ「運営の権限がある人と、停止・凍結中の人」
create function public.admin_profiles(p_ids uuid[] default null) returns setof public.profiles
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception '運営のみ実行できます'; end if;
  return query
    select * from public.profiles p
     where (p_ids is not null and p.id = any (p_ids))
        or (p_ids is null and (p.is_admin or p.moderation_status <> 'active'));
end $$;
revoke execute on function public.admin_profiles(uuid[]) from public, anon;
grant execute on function public.admin_profiles(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 4. 数の上限
-- ---------------------------------------------------------------------
create function private.limit_per_teacher() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_max int := tg_argv[0]::int;
  v_count int;
begin
  execute format('select count(*) from public.%I where teacher_id = $1', tg_table_name) into v_count using new.teacher_id;
  if v_count >= v_max then
    raise exception '登録できるのは%件までです', v_max using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger weekly_hours_limit before insert on public.weekly_hours
  for each row execute function private.limit_per_teacher('30');
create trigger offers_limit before insert on public.offers
  for each row execute function private.limit_per_teacher('20');
