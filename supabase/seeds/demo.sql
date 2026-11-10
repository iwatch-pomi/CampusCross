-- =====================================================================
-- ローカル開発用のサンプルデータ（デザイン確認用）
--   supabase/config.toml の [db.seed] から `supabase db reset` のときだけ読み込まれる。
--   本番では実行しないこと（`supabase db push` はシードを入れない）。
--   ユーザーは demo.hiroshima-u.ac.jp のアドレスで作る（実在しない）。
--   ここのデータを消せば、画面は実データ（DB）だけで動く。
-- =====================================================================

do $$
declare
  u record;
  v_fac uuid;
begin
  for u in
    select * from (values
      ('11111111-0000-0000-0000-000000000001'::uuid, 'demo-aoi@demo.hiroshima-u.ac.jp',   'あおい',   '情報科学部',   'informatics',    'M1', '機械学習で画像を解析しています。数式なしで話すのが得意です。'),
      ('11111111-0000-0000-0000-000000000002'::uuid, 'demo-ren@demo.hiroshima-u.ac.jp',   'れん',     '生物生産学部', 'life_science',   'B4', '微生物の培養と代謝を研究中。データ解析に興味あり。'),
      ('11111111-0000-0000-0000-000000000003'::uuid, 'demo-mio@demo.hiroshima-u.ac.jp',   'みお',     '法学部',       'social_science', 'B3', 'ゼミで労働法を勉強しています。'),
      ('11111111-0000-0000-0000-000000000004'::uuid, 'demo-sora@demo.hiroshima-u.ac.jp',  'そら',     '理学部',       'science',        'M2', '物性物理。なぜそうなるのかを考えるのが好き。'),
      ('11111111-0000-0000-0000-000000000005'::uuid, 'demo-hina@demo.hiroshima-u.ac.jp',  'ひな',     '文学部',       'humanities',     'B4', '古文書を読んで中世の暮らしを調べています。'),
      ('11111111-0000-0000-0000-000000000006'::uuid, 'demo-kai@demo.hiroshima-u.ac.jp',   'かい',     '工学部',       'engineering',    'B4', 'ロボットの制御をやっています。'),
      ('11111111-0000-0000-0000-000000000007'::uuid, 'demo-yui@demo.hiroshima-u.ac.jp',   'ゆい',     '教育学部',     'education',      'B2', '教え方・伝え方の研究に興味があります。'),
      ('11111111-0000-0000-0000-000000000008'::uuid, 'demo-taku@demo.hiroshima-u.ac.jp',  'たく',     '経済学部',     'social_science', 'B3', '行動経済学のゼミ。'),
      ('11111111-0000-0000-0000-000000000009'::uuid, 'demo-nana@demo.hiroshima-u.ac.jp',  'なな',     '総合科学部',   'interdisciplinary','B3', '文理どちらも少しずつ。')
    ) as t(id, email, name, faculty, field, grade, bio)
  loop
    if not exists (select 1 from auth.users where id = u.id) then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
              '{"provider":"email","providers":["email"]}', '{}', now(), now());
    end if;
    select id into v_fac from public.faculties where name = u.faculty;
    update public.profiles
       set display_name = u.name, faculty_id = v_fac, field_code = u.field, grade = u.grade, bio = u.bio,
           terms_version = (select terms_version from private.app_config), terms_agreed_at = now()
     where id = u.id;
  end loop;
end $$;

insert into public.offers (id, teacher_id, kind, title, hook, description, want_to_hear, field_code, tags, duration_min) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'topic', '15分でわかる：機械学習って結局なにがすごいの？', '前提知識ゼロでOK。数式は出しません', '画像認識や予測のしくみを、身近な例で説明します。', '生物系の人に、実験データの集め方を聞いてみたい', 'informatics', '{AI,Python,統計}', 15),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'topic', '微生物はどうやって「食べて」いる？代謝の話', '高校の生物を忘れていても大丈夫', '培養の現場と代謝経路のイメージを、図を描きながら話します。', '情報系の人に、培養データの解析方法を聞きたい', 'life_science', '{微生物,培養,代謝}', 15),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'faculty_guide', '法学部のゼミってどうやって決まる？', '他学部の人向けに、うちの学部の仕組みを話します', E'1. ゼミ・研究室はいつ、どうやって決まる？\n2. 所属は必修？\n3. 卒論はある？', null, 'social_science', '{ゼミ,卒論}', 15),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'topic', '「なぜ氷は滑る？」を物理で考える', '理系じゃなくても楽しめる話にします', '身近な現象から、原理を追いかける理学の考え方を紹介します。', '工学部の人に「それ、何に使えるの？」と聞かれたい', 'science', '{物理,身近な科学}', 30),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'topic', '古文書はどう読む？くずし字入門', '一文字読めるだけで世界が変わります', '実物の写真を見ながら、くずし字の読み方のコツを話します。', '情報系の人に、文字認識AIの話を聞きたい', 'humanities', '{歴史,古文書}', 30),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'topic', 'ロボットはどうやって「まっすぐ歩く」？', '制御の考え方を、紙とペンで説明します', null, '教育学部の人に、教え方のコツを聞きたい', 'engineering', '{ロボット,制御}', 15),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000006', 'faculty_guide', '工学部の研究室配属ってどう決まる？', '成績？希望？中の人が話します', null, null, 'engineering', '{研究室配属}', 15),
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000007', 'topic', '人に伝わる説明は、何がちがう？', 'プレゼンや発表が苦手な人にも', '教育学で扱う「わかる」の仕組みを、具体例で。', '理系の人の、専門の説明のしかたを聞きたい', 'education', '{プレゼン,伝え方}', 15),
  ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000008', 'topic', '人はなぜ「損したくない」？行動経済学', 'ゲーム感覚で体験してもらいます', null, null, 'social_science', '{経済,心理}', 15),
  ('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000005', 'faculty_guide', '文学部の卒論ってどんな感じ？', 'テーマの決め方から締め切りまで', null, null, 'humanities', '{卒論}', 15),
  ('22222222-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000009', 'faculty_guide', '総合科学部って何をしているの？', '文理融合の学び方を話します', null, null, 'interdisciplinary', '{文理融合}', 15)
on conflict (id) do nothing;

-- 空き枠（今日から数日後の昼休みなど）
insert into public.slots (teacher_id, start_at, end_at, places, place_note)
select t.teacher_id,
       date_trunc('day', now() at time zone 'Asia/Tokyo') + make_interval(days => t.d) + t.at - interval '9 hours',
       date_trunc('day', now() at time zone 'Asia/Tokyo') + make_interval(days => t.d) + t.at + make_interval(mins => t.len) - interval '9 hours',
       t.places::public.meeting_place[], t.note
from (values
  ('11111111-0000-0000-0000-000000000001'::uuid, 1, interval '12 hours 20 minutes', 15, '{library,zoom}', '中央図書館 1F 入口付近'),
  ('11111111-0000-0000-0000-000000000001'::uuid, 3, interval '16 hours 30 minutes', 30, '{campus_cafe}', '窓側のカウンター'),
  ('11111111-0000-0000-0000-000000000002'::uuid, 2, interval '12 hours 20 minutes', 15, '{cafeteria}', '入口すぐのテーブル'),
  ('11111111-0000-0000-0000-000000000003'::uuid, 1, interval '12 hours 30 minutes', 15, '{library}', null),
  ('11111111-0000-0000-0000-000000000004'::uuid, 4, interval '17 hours', 30, '{zoom}', null),
  ('11111111-0000-0000-0000-000000000005'::uuid, 2, interval '13 hours', 30, '{library}', '2F グループ学習エリア'),
  ('11111111-0000-0000-0000-000000000006'::uuid, 5, interval '12 hours 20 minutes', 15, '{cafeteria}', null),
  ('11111111-0000-0000-0000-000000000008'::uuid, 6, interval '18 hours', 15, '{zoom}', null)
) as t(teacher_id, d, at, len, places, note)
where not exists (select 1 from public.slots s where s.teacher_id = t.teacher_id and s.start_at > now());

-- Zoom の枠の URL（予約した人にだけ見える）
insert into public.slot_secrets (slot_id, meeting_url)
select s.id, 'https://zoom.us/j/0000000000'
  from public.slots s
 where 'zoom' = any (s.places) and not exists (select 1 from public.slot_secrets x where x.slot_id = s.id);
