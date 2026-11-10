-- 問い合わせ
-- ログインしている人は submit_inquiry() で送る（返信は大学メール／通知先メールへ。サイトの /contact でも読める）。
-- ログインできない人は、サーバー側（service role）から入れる。返信先のメールアドレスを必須にする。
-- 運営は admin_reply_inquiry() で返信・対応済みにする。

create type public.inquiry_category as enum ('usage', 'login', 'bug', 'safety', 'account', 'idea', 'other');
create type public.inquiry_status as enum ('open', 'answered', 'closed');

create table public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  category    public.inquiry_category not null,
  body        text not null check (char_length(body) between 5 and 2000),
  -- ログインしていない人の返信先（ログインしている人は null。返信時にプロフィールのメールを使う）
  reply_email text check (reply_email is null or (char_length(reply_email) <= 254 and reply_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  status      public.inquiry_status not null default 'open',
  reply       text check (char_length(reply) <= 4000),
  replied_by  uuid references public.profiles (id) on delete set null,
  replied_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint inquiries_has_sender check (user_id is not null or reply_email is not null)
);
create index inquiries_open_idx on public.inquiries (created_at desc) where status = 'open';
create index inquiries_user_idx on public.inquiries (user_id, created_at desc);
create index inquiries_email_idx on public.inquiries (reply_email, created_at desc) where user_id is null;

alter table public.inquiries enable row level security;
create policy "inquiries: 本人と運営が閲覧" on public.inquiries
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke all on public.inquiries from anon;
revoke insert, update, delete on public.inquiries from authenticated;

-- ログインしている人が送る（停止中の人も、停止についての問い合わせができるように受け付ける）
create function public.submit_inquiry(p_category public.inquiry_category, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'ログインしてください'; end if;
  if char_length(coalesce(trim(p_body), '')) < 5 then raise exception '内容を5文字以上で書いてください'; end if;
  if char_length(p_body) > 2000 then raise exception '内容は2000文字までです'; end if;
  if (select count(*) from public.inquiries
       where user_id = v_uid and created_at > now() - interval '24 hours') >= 5 then
    raise exception '問い合わせは1日5件までです。返信をお待ちください';
  end if;
  insert into public.inquiries (user_id, category, body)
  values (v_uid, p_category, trim(p_body))
  returning id into v_id;
  return v_id;
end $$;

-- 運営が返信する（p_reply が null なら、返信せずに閉じる）
create function public.admin_reply_inquiry(p_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception '運営のみ実行できます'; end if;
  update public.inquiries
     set reply      = nullif(trim(p_reply), ''),
         status     = case when nullif(trim(p_reply), '') is null then 'closed' else 'answered' end::public.inquiry_status,
         replied_by = auth.uid(),
         replied_at = now()
   where id = p_id;
  if not found then raise exception '問い合わせが見つかりません'; end if;
end $$;

revoke execute on function public.submit_inquiry(public.inquiry_category, text) from public, anon;
revoke execute on function public.admin_reply_inquiry(uuid, text) from public, anon;
grant execute on function public.submit_inquiry(public.inquiry_category, text) to authenticated;
grant execute on function public.admin_reply_inquiry(uuid, text) to authenticated;
