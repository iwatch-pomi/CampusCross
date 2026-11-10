-- 毎週のオフィスアワーを、曜日ごとに変更できるようにする
-- 変更すると、その登録から作った「まだ予約の入っていない先の枠」を取り消して、新しい時間で作り直す。
-- 予約の入っている枠と、休みにした（取り消した）週はそのまま残す。

grant update (weekday, start_time, minutes, places, place_note) on public.weekly_hours to authenticated;
create policy "weekly_hours: 本人が更新" on public.weekly_hours
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create function private.reset_weekly_slots() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.weekday, new.start_time, new.minutes, new.places, new.place_note)
     is distinct from (old.weekday, old.start_time, old.minutes, old.places, old.place_note) then
    -- 古い時間の空き枠は取り消し、登録とのつながりを外す（同じ日時でも作り直せるように）
    update public.slots
       set status = 'cancelled', weekly_hour_id = null
     where weekly_hour_id = new.id and status = 'open' and start_at > now();
  end if;
  return new;
end $$;
create trigger weekly_hours_reset_slots after update on public.weekly_hours
  for each row execute function private.reset_weekly_slots();

-- Zoom の URL も、本人が変更・削除できるようにする
grant update (meeting_url) on public.weekly_hour_secrets to authenticated;
grant delete on public.weekly_hour_secrets to authenticated;
create policy "weekly_hour_secrets: 本人が更新" on public.weekly_hour_secrets
  for update to authenticated
  using (exists (select 1 from public.weekly_hours w where w.id = weekly_hour_id and w.teacher_id = auth.uid()))
  with check (exists (select 1 from public.weekly_hours w where w.id = weekly_hour_id and w.teacher_id = auth.uid() and 'zoom' = any (w.places)));
create policy "weekly_hour_secrets: 本人が削除" on public.weekly_hour_secrets
  for delete to authenticated
  using (exists (select 1 from public.weekly_hours w where w.id = weekly_hour_id and w.teacher_id = auth.uid()));

-- 休みにした（取り消した）日は、時間を変更したあとも作り直さない
create or replace function private.generate_weekly_slots(p_teacher uuid default null) returns int
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
      continue when exists (
        select 1 from public.slots s
         where s.weekly_hour_id = w.id and s.status = 'cancelled'
           and (s.start_at at time zone 'Asia/Tokyo')::date = d
      );
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
