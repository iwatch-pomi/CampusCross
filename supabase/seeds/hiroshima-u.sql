-- =====================================================================
-- 広島大学向けの初期データ（Phase 1）
--   本番の Supabase では、マイグレーション適用後に SQL エディタで実行する。
--   何度実行しても重複しない。
--
-- 学部一覧: 広島大学の12学部（2026年11月時点。2026〜2027年度の新設・改組の情報なし）
-- field_code はその学部の代表的な分野。プロフィールの「分野」の初期値に使い、本人が変更できる。
-- =====================================================================

-- 学内メールのドメイン（サブドメインも許可される）
insert into private.allowed_email_domains (domain) values
  ('hiroshima-u.ac.jp')
on conflict do nothing;

-- 学部マスタ
insert into public.faculties (name, field_code, sort_order) values
  ('総合科学部',   'interdisciplinary', 10),
  ('文学部',       'humanities',        20),
  ('教育学部',     'education',         30),
  ('法学部',       'social_science',    40),
  ('経済学部',     'social_science',    50),
  ('理学部',       'science',           60),
  ('医学部',       'medical',           70),
  ('歯学部',       'medical',           80),
  ('薬学部',       'medical',           90),
  ('工学部',       'engineering',      100),
  ('生物生産学部', 'life_science',     110),
  ('情報科学部',   'informatics',      120)
on conflict (name) do update
  set field_code = excluded.field_code,
      sort_order = excluded.sort_order;
