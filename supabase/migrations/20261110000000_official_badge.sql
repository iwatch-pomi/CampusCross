-- 公式運営バッジ
-- 運営の権限（is_admin）がある人にだけ、運営が付けられる。本人が自分で付けることはできない。
-- 付いている人は、カード・カードの詳細・予約の画面で名前の横に「公式運営」と表示される。

alter table public.profiles add column is_official boolean not null default false;
-- is_official は authenticated の update 権限の列に含めない（本人は変えられない）

-- 運営の権限を外したら、バッジも自動で外す
create function private.sync_official() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not new.is_admin then
    new.is_official := false;
  end if;
  return new;
end $$;
create trigger profiles_sync_official before insert or update of is_admin, is_official on public.profiles
  for each row execute function private.sync_official();

-- バッジのない人は、運営・公式を名乗る表示名を使えない（なりすまし防止）
create function private.guard_official_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not new.is_official
     and new.display_name ~* '(運営|公式|事務局|管理者|campus[^a-z]?cross|キャンパス[^ぁ-んァ-ン]?クロス)' then
    raise exception '表示名に「運営」「公式」「Campus-Cross」などの言葉は使えません' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger profiles_official_name before insert or update of display_name on public.profiles
  for each row execute function private.guard_official_name();

-- 対応記録に、バッジの付け外しを残せるようにする
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('auto_hold', 'hold', 'release', 'ban', 'unban', 'resolve_report', 'university_referral', 'official_on', 'official_off'));

create function public.admin_set_official(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception '運営のみ実行できます'; end if;
  if p_on and not exists (select 1 from public.profiles where id = p_user and is_admin) then
    raise exception '公式運営バッジは、運営の権限がある人にだけ付けられます';
  end if;
  update public.profiles set is_official = p_on where id = p_user;
  if not found then raise exception 'ユーザーが見つかりません'; end if;
  insert into public.moderation_actions (admin_id, target_id, action)
  values (auth.uid(), p_user, case when p_on then 'official_on' else 'official_off' end);
end $$;

revoke execute on function public.admin_set_official(uuid, boolean) from public, anon;
grant execute on function public.admin_set_official(uuid, boolean) to authenticated;
