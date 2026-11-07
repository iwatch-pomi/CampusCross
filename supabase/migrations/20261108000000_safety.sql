-- =====================================================================
-- Campus-Cross 安全・防犯システム
--   1. 事前の予防  : 本名・連絡先を出さない / 同性限定リクエスト
--   2. 対話中の安全: 学内パブリックスペース（＋Zoom）限定・最長30分
--   3. 事後の厳罰  : 相互の安全レビュー / 確認後の即時永久凍結 / 大学窓口への通報記録
-- 詳細は docs/SPEC.md の「安全・防犯システム」を参照。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 設定
-- ---------------------------------------------------------------------
alter table private.app_config
  add column hold_threshold int not null default 2,      -- 別々の何人から深刻な通報が入ったら自動で一時停止するか
  add column terms_version text not null default '2026-11-v1';

-- ---------------------------------------------------------------------
-- 共通: 連絡先・SNS・URL の検出（本名非公開・事前アプローチ防止）
-- ---------------------------------------------------------------------
create function public.has_contact_info(p_text text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_text, '') ~* (
    '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'                     -- メールアドレス
    || '|https?://|www\.'                                        -- URL
    || '|0[0-9]{1,4}[-ー−‐ ]?[0-9]{1,4}[-ー−‐ ]?[0-9]{3,4}'      -- 電話番号
    || '|@[a-z0-9_.]{3,}'                                        -- SNS のハンドル
    || '|line ?id|(line|ライン)(交換|追加|教えて)'                 -- LINE
    || '|インスタ|instagram|twitter|ツイッター|tiktok|discord|ディスコード|facebook|フェイスブック|x\.com'
  )
$$;

-- TG_ARGV に渡した列に連絡先が含まれていたら拒否するトリガー
create function private.reject_contact_info() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(new);
  v_col text;
begin
  foreach v_col in array tg_argv loop
    if public.has_contact_info(v_row ->> v_col) then
      raise exception '連絡先・SNSアカウント・URLは書き込めません（安全のため、連絡先の交換は当日対面で任意に行ってください）'
        using errcode = 'P0001';
    end if;
  end loop;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. 事前の予防
-- ---------------------------------------------------------------------

-- 学科・専攻は個人の特定につながるので持たない（公開するのはニックネーム・学部・学年のみ）
alter table public.profiles drop column department;

-- 同性限定リクエスト（他の人に見えるのは「同性のみ受付」という事実だけ。性別そのものは見せない）
alter table public.profiles
  add column same_gender_only boolean not null default false,
  add column terms_version text,
  add column terms_agreed_at timestamptz,
  add column moderation_status text not null default 'active'
    check (moderation_status in ('active', 'on_hold', 'banned')),
  add column moderated_at timestamptz,
  add constraint profiles_display_name_no_id check (display_name !~ '[0-9]{5,}');

-- 規約への同意をオンボーディング完了の条件に加える（依存するポリシーを作り直す）
drop policy "offers: 本人が作成" on public.offers;
drop policy "slots: 本人が作成" on public.slots;
alter table public.profiles drop column onboarded;
alter table public.profiles add column onboarded boolean generated always as (
  display_name <> '' and faculty_id is not null and field_code is not null and terms_agreed_at is not null
) stored;

-- 一時停止・凍結の状態を is_suspended（既存の判定に使う列）に反映する
create function private.sync_suspended() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.is_suspended := new.moderation_status <> 'active';
  return new;
end $$;
create trigger profiles_sync_suspended before insert or update of moderation_status on public.profiles
  for each row execute function private.sync_suspended();

create trigger profiles_no_contact before insert or update of display_name, bio on public.profiles
  for each row execute function private.reject_contact_info('display_name', 'bio');

grant update (same_gender_only) on public.profiles to authenticated;

-- 性別は本人と運営だけが見られる profile_private に置く（同性限定の判定にだけ使う）
alter table public.profile_private
  add column gender text not null default 'unspecified'
    check (gender in ('female', 'male', 'unspecified'));
grant update (gender) on public.profile_private to authenticated;

-- 同性限定を使うには性別（女性／男性）の申告が必要。申告を外したら同性限定も外す
create function private.check_same_gender_setting() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'profiles' then
    if new.same_gender_only and coalesce(
         (select gender from public.profile_private where user_id = new.id), 'unspecified') = 'unspecified' then
      raise exception '同性限定を使うには、プロフィールで性別（女性／男性）を選んでください' using errcode = 'P0001';
    end if;
  elsif new.gender = 'unspecified' then
    update public.profiles set same_gender_only = false where id = new.user_id and same_gender_only;
  end if;
  return new;
end $$;
create trigger profiles_same_gender_check before insert or update of same_gender_only on public.profiles
  for each row execute function private.check_same_gender_setting();
create trigger profile_private_gender_check after update of gender on public.profile_private
  for each row execute function private.check_same_gender_setting();

-- 学ぶ人と話す人が、性別の設定上マッチしてよいか（データが欠けていたら安全側に倒して false）
create function private.gender_ok(p_learner uuid, p_teacher uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when lp.same_gender_only or tp.same_gender_only
        then lg.gender in ('female', 'male') and lg.gender = tg.gender
      else true
    end
    from public.profiles lp, public.profiles tp, public.profile_private lg, public.profile_private tg
    where lp.id = p_learner and tp.id = p_teacher and lg.user_id = p_learner and tg.user_id = p_teacher
  ), false)
$$;

-- 規約への同意（同意した日時はサーバーの時刻で記録する）
create function public.agree_terms(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current text;
begin
  select terms_version into v_current from private.app_config;
  if p_version is distinct from v_current then
    raise exception '利用規約が更新されています。ページを読み込み直してください';
  end if;
  update public.profiles set terms_version = p_version, terms_agreed_at = now() where id = auth.uid();
end $$;

-- 新規登録: 凍結したメールアドレスでは登録できない
create table private.banned_emails (
  email_hash text primary key,  -- メールアドレスそのものではなく SHA-256 を持つ
  banned_at timestamptz not null default now()
);

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_grant int;
begin
  if new.email is null or not private.is_allowed_email(new.email) then
    raise exception '学内のメールアドレスでのみ登録できます' using errcode = 'P0001';
  end if;
  if exists (select 1 from private.banned_emails where email_hash = encode(sha256(convert_to(lower(new.email), 'UTF8')), 'hex')) then
    raise exception 'このメールアドレスは利用できません' using errcode = 'P0001';
  end if;

  insert into public.profiles (id) values (new.id);
  insert into public.profile_private (user_id, university_email) values (new.id, lower(new.email));
  insert into public.wallets (user_id) values (new.id);

  select initial_grant into v_grant from private.app_config;
  perform private.apply_ledger(new.id, v_grant, 'signup_bonus');
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 2. 対話中の安全: 実施場所は学内パブリックスペース3種＋Zoom に固定、最長30分
-- ---------------------------------------------------------------------
create type public.meeting_place as enum ('cafeteria', 'library', 'campus_cafe', 'zoom');

alter table public.slots
  add column place public.meeting_place,
  add column place_note text;

update public.slots
   set place = case when mode = 'online' then 'zoom'::public.meeting_place else 'library'::public.meeting_place end,
       place_note = left(location, 40);

alter table public.slots
  alter column place set not null,
  drop column location,
  drop column mode,
  add column mode public.meeting_mode generated always as (
    case when place = 'zoom' then 'online'::public.meeting_mode else 'in_person'::public.meeting_mode end
  ) stored,
  -- 目印（例: 中央図書館1F 入口付近）。個室・研究室・自宅などを書かせない
  add constraint slots_place_note_check check (
    place_note is null
    or (char_length(place_note) <= 40
        and place_note !~* '(研究室|ラボ|lab|個室|自宅|実家|家で|部屋|寮|アパート|マンション|ホテル|カラオケ|車)')
  ),
  drop constraint slots_check,
  add constraint slots_duration_check check (end_at > start_at and end_at - start_at <= interval '30 minutes');

create trigger slots_no_contact before insert or update of place_note on public.slots
  for each row execute function private.reject_contact_info('place_note');

-- Zoom の URL は、話す人と予約した人だけが見られる
create table public.slot_secrets (
  slot_id uuid primary key references public.slots (id) on delete cascade,
  meeting_url text not null check (meeting_url ~* '^https://([a-z0-9-]+\.)*zoom\.us/[^\s]*$')
);
alter table public.slot_secrets enable row level security;

create policy "slot_secrets: 当事者が閲覧" on public.slot_secrets
  for select to authenticated using (
    exists (select 1 from public.slots s where s.id = slot_id and s.teacher_id = auth.uid())
    or exists (select 1 from public.bookings b where b.slot_id = slot_secrets.slot_id and b.learner_id = auth.uid() and b.status <> 'cancelled')
  );
create policy "slot_secrets: 話す人が登録" on public.slot_secrets
  for insert to authenticated with check (
    exists (select 1 from public.slots s where s.id = slot_id and s.teacher_id = auth.uid() and s.place = 'zoom')
  );
create policy "slot_secrets: 話す人が更新" on public.slot_secrets
  for update to authenticated using (exists (select 1 from public.slots s where s.id = slot_id and s.teacher_id = auth.uid()));
create policy "slot_secrets: 話す人が削除" on public.slot_secrets
  for delete to authenticated using (exists (select 1 from public.slots s where s.id = slot_id and s.teacher_id = auth.uid()));
revoke all on public.slot_secrets from anon;

-- 文字の入力欄にも連絡先を書かせない
create trigger offers_no_contact before insert or update of title, hook, description, want_to_hear on public.offers
  for each row execute function private.reject_contact_info('title', 'hook', 'description', 'want_to_hear');
create trigger bookings_no_contact before insert or update of message, thanks_message, cancel_reason on public.bookings
  for each row execute function private.reject_contact_info('message', 'thanks_message', 'cancel_reason');

-- ---------------------------------------------------------------------
-- 3. 事後の厳罰
-- ---------------------------------------------------------------------

-- 運営かどうか（運営用ページと RLS で使う）
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- 通報の理由を増やし、出どころ（通報 / 安全レビュー）と対応結果を持たせる
alter type public.report_reason add value if not exists 'dating';
alter type public.report_reason add value if not exists 'contact_pushing';
alter type public.report_reason add value if not exists 'place_change';

alter table public.reports
  add column source text not null default 'report' check (source in ('report', 'review')),
  add column resolution text check (char_length(resolution) <= 1000),
  add column resolved_by uuid references public.profiles (id) on delete set null,
  add column resolved_at timestamptz;

-- 相互の安全レビュー（相手には見えない。運営だけが見る）
create type public.review_feeling as enum ('safe', 'uneasy', 'problem');

create table public.safety_reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  feeling     public.review_feeling not null,
  flags       text[] not null default '{}' check (
    flags <@ array['off_topic', 'contact_pushing', 'dating', 'solicitation', 'harassment', 'overtime', 'place_change', 'no_show']
  ),
  comment     text check (char_length(comment) <= 1000),
  created_at  timestamptz not null default now(),
  unique (booking_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index safety_reviews_reviewee_idx on public.safety_reviews (reviewee_id, created_at desc);
alter table public.safety_reviews enable row level security;
create policy "safety_reviews: 本人が閲覧" on public.safety_reviews
  for select to authenticated using (reviewer_id = auth.uid());
create policy "safety_reviews: 運営が閲覧" on public.safety_reviews
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.safety_reviews from authenticated;
revoke all on public.safety_reviews from anon;

-- 運営の対応記録
create table public.moderation_actions (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles (id) on delete set null,
  target_id  uuid not null references public.profiles (id) on delete cascade,
  action     text not null check (action in ('auto_hold', 'hold', 'release', 'ban', 'unban', 'resolve_report', 'university_referral')),
  report_id  uuid references public.reports (id) on delete set null,
  note       text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.moderation_actions enable row level security;
create policy "moderation_actions: 運営が閲覧" on public.moderation_actions
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.moderation_actions from authenticated;
revoke all on public.moderation_actions from anon;

-- 大学関係部署への通報記録
create table public.university_referrals (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid not null references public.profiles (id) on delete cascade,
  department  text not null check (char_length(department) between 1 and 100),  -- 例: 学生支援の窓口、ハラスメント相談窓口
  summary     text not null check (char_length(summary) between 1 and 2000),
  referred_at date not null default current_date,
  admin_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.university_referrals enable row level security;
create policy "university_referrals: 運営が閲覧" on public.university_referrals
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.university_referrals from authenticated;
revoke all on public.university_referrals from anon;

-- 運営は通報・予約・学内メールアドレスを閲覧できる（対応と大学への通報のため）
create policy "reports: 運営が閲覧" on public.reports
  for select to authenticated using (public.is_admin());
create policy "bookings: 運営が閲覧" on public.bookings
  for select to authenticated using (public.is_admin());
create policy "profile_private: 運営が閲覧" on public.profile_private
  for select to authenticated using (public.is_admin());
create policy "offers: 運営が閲覧" on public.offers
  for select to authenticated using (public.is_admin());

-- 一時停止中・凍結中の人のカードは一覧に出さない
drop policy "offers: 閲覧" on public.offers;
create policy "offers: 閲覧" on public.offers
  for select to authenticated using (
    teacher_id = auth.uid()
    or exists (select 1 from public.bookings b where b.offer_id = offers.id and b.learner_id = auth.uid())
    or (is_active and exists (select 1 from public.profiles p where p.id = offers.teacher_id and not p.is_suspended))
  );

-- 作り直し（規約に同意済みで、停止中でない人だけがカード・枠を出せる）
create policy "offers: 本人が作成" on public.offers
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.onboarded and not p.is_suspended)
  );
create policy "slots: 本人が作成" on public.slots
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and status = 'open'
    and start_at > now()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.onboarded and not p.is_suspended)
  );

-- 予約を運営側の都合で取り消す（返却つき）
create function private.system_cancel_booking(p_booking_id uuid, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id and status = 'booked' for update;
  if not found then return; end if;
  update public.bookings
     set status = 'cancelled', cancel_reason = p_reason, cancelled_at = now()
   where id = p_booking_id;
  -- 話す人が停止中なら枠ごと取り消し、そうでなければ（学ぶ人の凍結など）枠を空きに戻す
  update public.slots s
     set status = case
       when s.start_at > now() and not exists (select 1 from public.profiles p where p.id = s.teacher_id and p.is_suspended)
         then 'open'::public.slot_status
       else 'cancelled'::public.slot_status
     end
   where s.id = v_booking.slot_id;
  perform private.apply_ledger(v_booking.learner_id, 1, 'booking_refund', p_booking_id);
end $$;

-- 深刻な通報が別々の hold_threshold 人から届いたら、運営の確認を待たずに一時停止する
create function private.evaluate_auto_hold(p_user uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_threshold int;
  v_count int;
begin
  select hold_threshold into v_threshold from private.app_config;
  select count(distinct reporter_id) into v_count
    from public.reports
   where target_user_id = p_user
     and status in ('open', 'reviewing')
     and reason in ('harassment', 'solicitation', 'dating', 'contact_pushing', 'place_change');
  if v_count >= v_threshold then
    update public.profiles set moderation_status = 'on_hold', moderated_at = now()
     where id = p_user and moderation_status = 'active';
    if found then
      insert into public.moderation_actions (target_id, action, note)
      values (p_user, 'auto_hold', format('別々の%s人から深刻な通報があったため自動で一時停止', v_count));
    end if;
  end if;
end $$;

-- 通報のあとに自動停止の判定をする
create function private.after_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.evaluate_auto_hold(new.target_user_id);
  return new;
end $$;
create trigger reports_after_insert after insert on public.reports
  for each row execute function private.after_report();

-- 安全レビューを送る（セッションの開始時刻を過ぎた予約の当事者だけ。1予約につき1回）
create function public.submit_safety_review(
  p_booking_id uuid, p_feeling public.review_feeling, p_flags text[] default '{}', p_comment text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_start timestamptz;
  v_other uuid;
  v_serious text[] := array['contact_pushing', 'dating', 'solicitation', 'harassment', 'place_change'];
  v_reason public.report_reason;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or v_uid is null or v_uid not in (v_booking.learner_id, v_booking.teacher_id) then
    raise exception '予約が見つかりません';
  end if;
  select start_at into v_start from public.slots where id = v_booking.slot_id;
  if v_start > now() then
    raise exception 'セッションの開始後に回答できます';
  end if;
  if v_booking.status = 'cancelled' and v_booking.cancelled_at < v_start then
    raise exception '開始前にキャンセルされた予約には回答できません';
  end if;
  v_other := case when v_uid = v_booking.learner_id then v_booking.teacher_id else v_booking.learner_id end;

  insert into public.safety_reviews (booking_id, reviewer_id, reviewee_id, feeling, flags, comment)
  values (p_booking_id, v_uid, v_other, p_feeling, coalesce(p_flags, '{}'), nullif(trim(p_comment), ''));

  -- 「問題があった」または深刻なサインがあれば、運営の確認待ちの通報として登録する
  if p_feeling = 'problem' or coalesce(p_flags, '{}') && v_serious then
    v_reason := case
      when 'harassment' = any(p_flags) then 'harassment'
      when 'dating' = any(p_flags) then 'dating'
      when 'solicitation' = any(p_flags) then 'solicitation'
      when 'contact_pushing' = any(p_flags) then 'contact_pushing'
      when 'place_change' = any(p_flags) then 'place_change'
      else 'other'
    end;
    insert into public.reports (reporter_id, target_user_id, booking_id, reason, detail, source)
    values (v_uid, v_other, p_booking_id, v_reason, nullif(trim(p_comment), ''), 'review');
  end if;
exception when unique_violation then
  raise exception 'この予約の安全レビューは回答済みです';
end $$;

-- 運営: 一時停止・解除・永久凍結
create function public.admin_set_status(p_user uuid, p_status text, p_note text default null, p_report_id uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := auth.uid();
  v_email text;
  v_booking uuid;
begin
  if not public.is_admin() then raise exception '運営のみ実行できます'; end if;
  if p_status not in ('active', 'on_hold', 'banned') then raise exception '状態が不正です'; end if;
  if p_user = v_admin then raise exception '自分自身は操作できません'; end if;

  update public.profiles set moderation_status = p_status, moderated_at = now() where id = p_user;
  if not found then raise exception 'ユーザーが見つかりません'; end if;

  if p_status = 'banned' then
    -- カードを非公開に、これからの枠を取り消し、入っている予約はすべて取り消して返却
    update public.offers set is_active = false where teacher_id = p_user;
    for v_booking in
      select b.id from public.bookings b join public.slots s on s.id = b.slot_id
       where b.status = 'booked' and (b.teacher_id = p_user or b.learner_id = p_user)
    loop
      perform private.system_cancel_booking(v_booking, '運営の判断により取り消されました');
    end loop;
    update public.slots set status = 'cancelled' where teacher_id = p_user and status = 'open';

    -- 同じメールアドレスで登録し直せないようにする
    select university_email into v_email from public.profile_private where user_id = p_user;
    insert into private.banned_emails (email_hash)
    values (encode(sha256(convert_to(lower(v_email), 'UTF8')), 'hex'))
    on conflict do nothing;

    -- ログインできないようにし、今あるセッションを無効にする
    update auth.users set banned_until = '2999-12-31'::timestamptz where id = p_user;
    delete from auth.sessions where user_id = p_user;
  elsif p_status = 'active' then
    update auth.users set banned_until = null where id = p_user;
    select university_email into v_email from public.profile_private where user_id = p_user;
    delete from private.banned_emails where email_hash = encode(sha256(convert_to(lower(v_email), 'UTF8')), 'hex');
  end if;

  insert into public.moderation_actions (admin_id, target_id, action, report_id, note)
  values (v_admin, p_user,
          case p_status when 'banned' then 'ban' when 'on_hold' then 'hold' else 'release' end,
          p_report_id, p_note);

  if p_report_id is not null then
    update public.reports
       set status = 'resolved', resolution = coalesce(p_note, resolution), resolved_by = v_admin, resolved_at = now()
     where id = p_report_id;
  end if;
end $$;

-- 運営: 通報を対応済みにする（処分なし）
create function public.admin_resolve_report(p_report_id uuid, p_status public.report_status, p_resolution text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid;
begin
  if not public.is_admin() then raise exception '運営のみ実行できます'; end if;
  update public.reports
     set status = p_status, resolution = p_resolution, resolved_by = auth.uid(),
         resolved_at = case when p_status = 'resolved' then now() end
   where id = p_report_id
  returning target_user_id into v_target;
  if v_target is null then raise exception '通報が見つかりません'; end if;
  insert into public.moderation_actions (admin_id, target_id, action, report_id, note)
  values (auth.uid(), v_target, 'resolve_report', p_report_id, p_resolution);
end $$;

-- 運営: 大学関係部署への通報を記録する（通報そのものは運営が大学の窓口に連絡して行う）
create function public.admin_record_referral(p_user uuid, p_department text, p_summary text, p_referred_at date default current_date)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception '運営のみ実行できます'; end if;
  insert into public.university_referrals (target_id, department, summary, referred_at, admin_id)
  values (p_user, p_department, p_summary, coalesce(p_referred_at, current_date), auth.uid())
  returning id into v_id;
  insert into public.moderation_actions (admin_id, target_id, action, note)
  values (auth.uid(), p_user, 'university_referral', p_department);
  return v_id;
end $$;

-- 予約できる相手か（同性限定・ブロック・停止を考慮）。一覧から、申し込めない相手のカードを外すのに使う
create function public.bookable_teachers(p_ids uuid[]) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select t.id
    from public.profiles t
   where t.id = any(p_ids)
     and not t.is_suspended
     and private.gender_ok(auth.uid(), t.id)
     and not exists (
       select 1 from public.blocks
        where (blocker_id = auth.uid() and blocked_id = t.id) or (blocker_id = t.id and blocked_id = auth.uid())
     )
$$;

-- 予約に「同性限定」の判定を加える（それ以外は前のマイグレーションと同じ）
create or replace function public.book_slot(p_slot_id uuid, p_offer_id uuid, p_message text default null)
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

  insert into public.bookings (slot_id, offer_id, learner_id, teacher_id, message, is_cross_field)
  values (
    v_slot.id, v_offer.id, v_uid, v_teacher.id, p_message,
    v_learner.faculty_id is distinct from v_teacher.faculty_id
      or v_learner.field_code is distinct from v_teacher.field_code
  )
  returning id into v_id;

  update public.slots set status = 'booked' where id = v_slot.id;
  perform private.apply_ledger(v_uid, -1, 'booking_hold', v_id);

  return v_id;
end $$;

-- 実行権限
revoke execute on function public.agree_terms(text) from public, anon;
revoke execute on function public.submit_safety_review(uuid, public.review_feeling, text[], text) from public, anon;
revoke execute on function public.admin_set_status(uuid, text, text, uuid) from public, anon;
revoke execute on function public.admin_resolve_report(uuid, public.report_status, text) from public, anon;
revoke execute on function public.admin_record_referral(uuid, text, text, date) from public, anon;
revoke execute on function public.bookable_teachers(uuid[]) from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.agree_terms(text) to authenticated;
grant execute on function public.submit_safety_review(uuid, public.review_feeling, text[], text) to authenticated;
grant execute on function public.admin_set_status(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_resolve_report(uuid, public.report_status, text) to authenticated;
grant execute on function public.admin_record_referral(uuid, text, text, date) to authenticated;
grant execute on function public.bookable_teachers(uuid[]) to authenticated;
grant execute on function public.is_admin() to authenticated;
