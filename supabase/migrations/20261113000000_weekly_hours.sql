-- 毎週のオフィスアワー（月〜日の曜日ごとに登録）
-- 登録した曜日・時刻から、4週間先までの空き枠を自動でつくる（毎日 pg_cron で先へ延ばす）。
-- 特定の週だけ休むときは、その日の枠を取り消せばよい（取り消した枠は作り直さない）。

create table public.weekly_hours (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 7),  -- 1=月 … 7=日（ISO）
  start_time time not null,
  minutes    smallint not null check (minutes in (15, 30)),
  places     public.meeting_place[] not null check (cardinality(places) between 1 and 4 and array_position(places, null) is null),
  place_note text check (
    place_note is null
    or (char_length(place_note) <= 40
        and place_note !~* '(研究室|ラボ|lab|個室|自宅|実家|家で|部屋|寮|アパート|マンション|ホテル|カラオケ|車)')
  ),
  created_at timestamptz not null default now(),
  unique (teacher_id, weekday, start_time)
);
create index weekly_hours_teacher_idx on public.weekly_hours (teacher_id, weekday, start_time);

create trigger weekly_hours_normalize_places before insert or update of places on public.weekly_hours
  for each row execute function private.normalize_slot_places();
create trigger weekly_hours_no_contact before insert or update of place_note on public.weekly_hours
  for each row execute function private.reject_contact_info('place_note');

alter table public.weekly_hours enable row level security;
create policy "weekly_hours: 本人が閲覧" on public.weekly_hours
  for select to authenticated using (teacher_id = auth.uid());
create policy "weekly_hours: 本人が作成" on public.weekly_hours
  for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.onboarded and not p.is_suspended)
  );
create policy "weekly_hours: 本人が削除" on public.weekly_hours
  for delete to authenticated using (teacher_id = auth.uid());
revoke all on public.weekly_hours from anon;
revoke update on public.weekly_hours from authenticated;

-- 毎週の枠の Zoom の URL（本人だけ。枠をつくるときに slot_secrets へ写す）
create table public.weekly_hour_secrets (
  weekly_hour_id uuid primary key references public.weekly_hours (id) on delete cascade,
  meeting_url    text not null check (meeting_url ~* '^https://([a-z0-9-]+\.)*zoom\.us/[^\s]*$')
);
alter table public.weekly_hour_secrets enable row level security;
create policy "weekly_hour_secrets: 本人が閲覧" on public.weekly_hour_secrets
  for select to authenticated using (exists (select 1 from public.weekly_hours w where w.id = weekly_hour_id and w.teacher_id = auth.uid()));
create policy "weekly_hour_secrets: 本人が登録" on public.weekly_hour_secrets
  for insert to authenticated with check (
    exists (select 1 from public.weekly_hours w where w.id = weekly_hour_id and w.teacher_id = auth.uid() and 'zoom' = any (w.places))
  );
revoke all on public.weekly_hour_secrets from anon;
revoke update, delete on public.weekly_hour_secrets from authenticated;

-- 枠が、どの毎週の登録から作られたか（同じ日時を二重に作らない・取り消した週を作り直さない）
alter table public.slots add column weekly_hour_id uuid references public.weekly_hours (id) on delete set null;
create unique index slots_weekly_once on public.slots (weekly_hour_id, start_at) where weekly_hour_id is not null;

-- 毎週の登録を消したら、そこから作った「まだ予約の入っていない先の枠」も取り消す
create function private.cancel_weekly_slots() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.slots
     set status = 'cancelled'
   where weekly_hour_id = old.id and status = 'open' and start_at > now();
  return old;
end $$;
create trigger weekly_hours_cancel_slots before delete on public.weekly_hours
  for each row execute function private.cancel_weekly_slots();

-- 4週間先までの枠をつくる。p_teacher を渡すとその人の分だけ。作った枠の数を返す
create function private.generate_weekly_slots(p_teacher uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_count int := 0;
  v_rows  int;
  w       record;
  d       date;
  v_start timestamptz;
begin
  for w in
    select wh.*, ws.meeting_url
      from public.weekly_hours wh
      join public.profiles p on p.id = wh.teacher_id
      left join public.weekly_hour_secrets ws on ws.weekly_hour_id = wh.id
     where (p_teacher is null or wh.teacher_id = p_teacher)
       and p.onboarded and not p.is_suspended
  loop
    for d in select g::date from generate_series(v_today, v_today + 27, interval '1 day') g loop
      continue when extract(isodow from d) <> w.weekday;
      v_start := (d + w.start_time) at time zone 'Asia/Tokyo';
      continue when v_start <= now();
      -- 同じ登録の同じ日時（取り消し済みを含む）や、ほかの枠と重なる時間はつくらない
      insert into public.slots (teacher_id, start_at, end_at, places, place_note, weekly_hour_id)
      values (w.teacher_id, v_start, v_start + make_interval(mins => w.minutes), w.places, w.place_note, w.id)
      on conflict do nothing;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then
        v_count := v_count + 1;
        if w.meeting_url is not null then
          insert into public.slot_secrets (slot_id, meeting_url)
          select s.id, w.meeting_url from public.slots s where s.weekly_hour_id = w.id and s.start_at = v_start
          on conflict do nothing;
        end if;
      end if;
    end loop;
  end loop;
  return v_count;
end $$;

-- 本人が登録・削除したあとに呼ぶ
create function public.sync_my_weekly_slots() returns int
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  return private.generate_weekly_slots(auth.uid());
end $$;
revoke execute on function public.sync_my_weekly_slots() from public, anon;
grant execute on function public.sync_my_weekly_slots() to authenticated;

-- 毎日、4週間先まで延ばす（pg_cron が有効なとき）
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('campus-cross-weekly-slots', '17 15 * * *', 'select private.generate_weekly_slots()');
  end if;
end $$;
