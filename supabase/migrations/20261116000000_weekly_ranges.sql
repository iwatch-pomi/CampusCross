-- 毎週のオフィスアワーを「時間帯」で登録し、1回の長さ（15分・30分）ごとに分けて枠をつくる
-- 例：月曜 10:30〜12:50、15分ずつ → 10:30, 10:45, … 12:30 の9枠
-- end_time が空なら、これまでどおり start_time からの1枠だけ

alter table public.weekly_hours add column end_time time;
alter table public.weekly_hours add constraint weekly_hours_range_check check (
  end_time is null
  or (end_time > start_time and end_time - start_time >= make_interval(mins => minutes))
);
grant insert (end_time), update (end_time) on public.weekly_hours to authenticated;

-- 同じ曜日の時間帯どうしが重ならないようにする
create function private.weekly_hours_no_overlap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.weekly_hours w
     where w.teacher_id = new.teacher_id and w.weekday = new.weekday and w.id <> new.id
       and w.start_time < coalesce(new.end_time, new.start_time + make_interval(mins => new.minutes))
       and new.start_time < coalesce(w.end_time, w.start_time + make_interval(mins => w.minutes))
  ) then
    raise exception '同じ曜日に、時間が重なる登録があります' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger weekly_hours_no_overlap before insert or update of weekday, start_time, end_time, minutes on public.weekly_hours
  for each row execute function private.weekly_hours_no_overlap();

-- 変更したときの作り直し。
-- その日の枠をすべて取り消していた（＝その日は休み）なら、休みのまま残す。
-- それ以外の日は、予約の入っていない枠（空き・取り消し済み）を登録から外して、新しい時間で作り直す
create or replace function private.reset_weekly_slots() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.weekday, new.start_time, new.end_time, new.minutes, new.places, new.place_note)
     is distinct from (old.weekday, old.start_time, old.end_time, old.minutes, old.places, old.place_note) then
    update public.slots s
       set status = 'cancelled', weekly_hour_id = null
     where s.weekly_hour_id = new.id and s.status in ('open', 'cancelled') and s.start_at > now()
       and exists (
         select 1 from public.slots o
          where o.weekly_hour_id = new.id and o.status <> 'cancelled'
            and (o.start_at at time zone 'Asia/Tokyo')::date = (s.start_at at time zone 'Asia/Tokyo')::date
       );
  end if;
  return new;
end $$;

-- 4週間先までの枠をつくる（時間帯なら1回の長さごとに分ける）
create or replace function private.generate_weekly_slots(p_teacher uuid default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_count int := 0;
  v_rows  int;
  w       record;
  d       date;
  v_from  int;   -- 0時からの分
  v_to    int;
  v_m     int;
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
    v_from := extract(hour from w.start_time)::int * 60 + extract(minute from w.start_time)::int;
    v_to := case when w.end_time is null then v_from + w.minutes
                 else extract(hour from w.end_time)::int * 60 + extract(minute from w.end_time)::int end;

    for d in select g::date from generate_series(v_today, v_today + 27, interval '1 day') g loop
      continue when extract(isodow from d) <> w.weekday;
      -- その日の枠をすべて取り消していたら、休みの日として作らない
      continue when exists (
          select 1 from public.slots s
           where s.weekly_hour_id = w.id and s.status = 'cancelled'
             and (s.start_at at time zone 'Asia/Tokyo')::date = d)
        and not exists (
          select 1 from public.slots s
           where s.weekly_hour_id = w.id and s.status <> 'cancelled'
             and (s.start_at at time zone 'Asia/Tokyo')::date = d);

      v_m := v_from;
      while v_m + w.minutes <= v_to loop
        v_start := (d + make_interval(mins => v_m)) at time zone 'Asia/Tokyo';
        if v_start > now() then
          -- 同じ日時（取り消し済みを含む）や、ほかの枠と重なる時間はつくらない
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
        end if;
        v_m := v_m + w.minutes;
      end loop;
    end loop;
  end loop;
  return v_count;
end $$;
