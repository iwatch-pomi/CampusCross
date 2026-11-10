-- =====================================================================
-- SQL の実行チェック
-- Supabase の SQL Editor にこのファイルの中身を全部貼って「Run」を押すと、
-- マイグレーションと初期データがそれぞれ実行済みかを ✅ / ❌ で表示します。
-- 何も書き換えません（一時的な関数を1つ作るだけで、接続が終わると消えます）。
--
-- ❌ が出たら、その行の「ファイル」を上から順に実行してください（順番が大事です）。
-- 新しいマイグレーションを追加したら、このファイルにも1行足してください。
-- =====================================================================

-- pg_cron が入っていなくてもエラーにならないように、ジョブの確認だけ関数にする
create or replace function pg_temp.cc_has_cron_job(p_name text) returns boolean
language plpgsql as $$
begin
  if to_regclass('cron.job') is null then return false; end if;
  return exists (select 1 from cron.job where jobname = p_name);
end $$;

create or replace function pg_temp.cc_has_column(p_table text, p_column text) returns boolean
language sql as $$
  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = p_table and column_name = p_column)
$$;

select
  順番,
  case when ok then '✅ 実行済み' else '❌ 未実行' end as 状態,
  ファイル,
  内容
from (values
  (1, 'supabase/migrations/20261107000000_init.sql', '基本の表・チケット・予約',
      to_regclass('public.offers') is not null
      and to_regprocedure('public.claim_monthly_grant()') is not null),

  (2, 'supabase/migrations/20261108000000_safety.sql', '安全・防犯（同性限定・通報・凍結など）',
      to_regclass('public.safety_reviews') is not null
      and to_regprocedure('public.bookable_teachers(uuid[])') is not null),

  (3, 'supabase/seeds/hiroshima-u.sql', '初期データ（広島大学のドメインと12学部）',
      to_regclass('private.allowed_email_domains') is not null
      and (select count(*) from public.faculties) >= 12),

  (4, 'supabase/migrations/20261110000000_official_badge.sql', '公式運営バッジ',
      pg_temp.cc_has_column('profiles', 'is_official')
      and to_regprocedure('public.admin_set_official(uuid, boolean)') is not null),

  (5, 'supabase/migrations/20261111000000_inquiries.sql', '問い合わせ',
      to_regclass('public.inquiries') is not null
      and to_regprocedure('public.admin_reply_inquiry(uuid, text)') is not null),

  (6, 'supabase/migrations/20261112000000_slot_places.sql', '空き枠の場所を複数に',
      pg_temp.cc_has_column('slots', 'places')
      and pg_temp.cc_has_column('bookings', 'place')
      and not pg_temp.cc_has_column('slots', 'place')),

  (7, 'supabase/migrations/20261113000000_weekly_hours.sql', '毎週のオフィスアワー',
      to_regclass('public.weekly_hours') is not null
      and to_regprocedure('public.sync_my_weekly_slots()') is not null),

  (8, 'supabase/migrations/20261113010000_reschedule.sql', '延期の提案',
      to_regclass('public.reschedule_proposals') is not null
      and to_regprocedure('public.accept_reschedule(uuid, uuid)') is not null),

  (9, 'supabase/migrations/20261114000000_weekly_hours_edit.sql', '毎週のオフィスアワーを曜日ごとに変更',
      to_regprocedure('private.reset_weekly_slots()') is not null),

  (10, 'supabase/migrations/20261115000000_hardening.sql', '公開前の見直し（通報・書き込める列・プロフィールの見え方）',
      to_regprocedure('public.my_profile()') is not null
      and to_regprocedure('public.admin_profiles(uuid[])') is not null),

  (11, '（自動）pg_cron のジョブ：campus-cross-auto-complete', '終わった予約の自動完了（毎時）',
      pg_temp.cc_has_cron_job('campus-cross-auto-complete')),

  (12, '（自動）pg_cron のジョブ：campus-cross-weekly-slots', '毎週の枠を先へ延ばす（毎日）',
      pg_temp.cc_has_cron_job('campus-cross-weekly-slots'))
) as t(順番, ファイル, 内容, ok)
order by 順番;

-- 11・12 が ❌ のとき：Database → Extensions で pg_cron を有効にしてから、次の2行を実行する
--   select cron.schedule('campus-cross-auto-complete', '7 * * * *', 'select private.auto_complete_bookings()');
--   select cron.schedule('campus-cross-weekly-slots', '17 15 * * *', 'select private.generate_weekly_slots()');
