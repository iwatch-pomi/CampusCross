# Supabase：スキーマとセットアップ

`migrations/20261107000000_init.sql` に、Phase 1 のデータ構造・チケットのロジック・RLS がすべて入っています。大学ごとの初期データ（ドメイン・学部）は `seeds/` にあります。

## テーブル

| テーブル | 役割 | 誰が読めるか | 書き込み |
|---|---|---|---|
| `fields` | 分野マスタ（理学・工学・情報…） | ログインユーザー全員 | なし（マイグレーションで管理） |
| `faculties` | 学部マスタ（自大学の学部を運営が登録） | ログインユーザー全員 | なし（運営がSQLで登録） |
| `profiles` | 表示名・学部・分野・学年・自己紹介 | ログインユーザー全員 | 本人（一部の列だけ） |
| `profile_private` | 大学メール・通知先メール | 本人のみ | 本人（通知先のみ） |
| `wallets` | チケット残高 | 本人のみ | **関数経由のみ** |
| `token_ledger` | チケットの増減の履歴 | 本人のみ | **関数経由のみ** |
| `offers` | 募集カード。種類は `topic`（専門テーマ）と `faculty_guide`（学部のしくみ） | 公開中のもの＋自分のもの＋自分が予約したもの | 本人 |
| `slots` | オフィスアワーの枠 | ログインユーザー全員 | 本人（予約が入っていない枠のみ） |
| `bookings` | 予約 | 当事者（学ぶ側・教える側）のみ | **関数経由のみ** |
| `blocks` / `reports` | ブロック・通報 | 本人のみ | 本人 |

匿名（ログインしていない）ユーザーには、どのテーブルも見えません。

## 安全・防犯（`migrations/20261108000000_safety.sql`）

| 追加したもの | 内容 |
|---|---|
| `profiles.same_gender_only` | 同性からの申し込みのみ受け付ける（公開されるのはこの設定だけ） |
| `profile_private.gender` | 性別（本人と運営のみ）。同性限定の判定だけに使う |
| `profiles.moderation_status` | `active` / `on_hold`（一時停止）/ `banned`（永久凍結）。`is_suspended` に自動で反映 |
| `profiles.terms_version` / `terms_agreed_at` | 利用規約への同意。未同意だとオンボーディング未完了扱い |
| `slots.places` / `place_note` | 場所の候補（1〜4つ）。`cafeteria`・`library`・`campus_cafe`・`zoom` のみ。目印に個室・研究室などは書けない。最長30分（`migrations/20261112000000_slot_places.sql` で1つ → 複数に変更） |
| `bookings.place` | 予約した人が候補の中から選んだ場所。Zoom の URL は、Zoom を選んだ人にだけ見える |
| `slot_secrets` | Zoom の URL（話す人と予約した人だけが読める） |
| `safety_reviews` | 相互の安全レビュー（回答者と運営だけが読める） |
| `reports`（拡張） | 理由に出会い目的・連絡先の要求・場所の誘導を追加。安全レビューからの自動登録（`source = 'review'`） |
| `moderation_actions` / `university_referrals` | 運営の対応記録と、大学への通報記録（運営のみ） |
| `private.banned_emails` | 凍結したメールアドレスの SHA-256（再登録の拒否に使う） |
| `has_contact_info()` とトリガー | 自己紹介・カード・ひとこと・お礼・目印に、メール・電話・URL・SNS ID を書くと拒否 |

| RPC | 誰が | 内容 |
|---|---|---|
| `agree_terms(p_version)` | 全員 | 利用規約に同意する |
| `bookable_teachers(p_ids)` | 全員 | 自分が申し込める相手だけを返す（同性限定・ブロック・停止を考慮。性別は返さない） |
| `submit_safety_review(...)` | 当事者 | 安全レビューを送る。深刻なら通報として登録し、別々の2人に達したら自動で一時停止 |
| `admin_set_status(p_user, p_status, p_note, p_report_id)` | 運営 | 一時停止・解除・永久凍結。凍結すると予約の取り消しと返却、カードの非公開、ログイン停止（`auth.users.banned_until`）、セッション削除、再登録の拒否 |
| `admin_resolve_report(...)` / `admin_record_referral(...)` | 運営 | 通報への対応の記録／大学への通報の記録 |

## 公式運営バッジ（`migrations/20261110000000_official_badge.sql`）

| 追加したもの | 内容 |
|---|---|
| `profiles.is_official` | 公式運営バッジ。本人は変えられず、運営が `admin_set_official(p_user, p_on)` で付け外しする。運営の権限（`is_admin`）がある人にだけ付けられ、権限を外すとバッジも自動で外れる |
| 表示名のチェック | バッジのない人は、「運営」「公式」「事務局」「管理者」「Campus-Cross」「キャンパス・クロス」を含む表示名を使えない（なりすまし防止） |

## 問い合わせ（`migrations/20261111000000_inquiries.sql`）

| 追加したもの | 内容 |
|---|---|
| `inquiries` | 種類（使い方・ログインできない・不具合・安全・アカウント・要望・その他）、内容、返信、状態（`open` / `answered` / `closed`）。読めるのは本人と運営だけ |
| `submit_inquiry(p_category, p_body)` | ログインしている人が送る（1日5件まで。停止中の人も送れる） |
| `admin_reply_inquiry(p_id, p_reply)` | 運営が返信する。`p_reply` が null なら、返信せずに閉じる |

ログインしていない人の問い合わせは、Next.js のサーバー側から service role で入れます（返信先のメールアドレスが必須。同じアドレスから1時間に3件、全体で1時間に30件まで）。新しい問い合わせは運営の全員にメールで知らせ、返信は Resend でメールでも届けます。

## 毎週のオフィスアワー（`migrations/20261113000000_weekly_hours.sql`）

| 追加したもの | 内容 |
|---|---|
| `weekly_hours` | 曜日（1=月 … 7=日）・開始時刻・長さ・場所の候補・目印。本人だけが読み書きできる |
| `weekly_hour_secrets` | 毎週の枠の Zoom の URL（本人だけ）。枠をつくるときに `slot_secrets` へ写す |
| `slots.weekly_hour_id` | どの毎週の登録から作られた枠か。同じ日時は二重に作らず、取り消した週も作り直さない |
| `sync_my_weekly_slots()` | 自分の毎週の登録から、4週間先までの枠をつくる（登録した直後に呼ぶ） |
| `private.generate_weekly_slots()` | 全員分をつくる。pg_cron で毎日 0:17（日本時間）に実行して、先の週を足していく |

毎週の登録を消すと、そこから作った「まだ予約の入っていない先の枠」も取り消されます。

## 延期の提案（`migrations/20261113010000_reschedule.sql`）

| 追加したもの | 内容 |
|---|---|
| `reschedule_proposals` / `reschedule_options` | 提案（ひとこと・状態・返事の期限）と、候補の日時（1〜3つ）。読めるのは当事者だけ |
| `propose_reschedule(p_booking_id, p_slot_ids, p_starts, p_message)` | 話す人。候補は自分の空き枠（予約で選ばれた場所を含み、長さが足りるもの）か、新しい日時（ほかの枠と重ならないもの） |
| `accept_reschedule(p_proposal_id, p_option_id)` | 予約した人。予約をその日時に移し、元の枠は取り消す。新しい日時なら、場所・目印・Zoom の URL を元の枠から写した枠をつくる |
| `decline_reschedule(p_proposal_id)` | 予約した人。予約を取り消し、チケットを戻す |
| `private.expire_reschedules()` | 返事がないまま元の開始時刻を過ぎた提案は、予約を取り消してチケットを戻す（自動完了の処理の最初に実行） |

回答待ちの提案がある予約は、完了にできません（自動完了もしない）。予約がキャンセルされると、回答待ちの提案は取り下げ扱いになります。

自動一時停止のしきい値は `private.app_config.hold_threshold`（初期値2人）、利用規約の版は `terms_version` で変えられます（画面側の `lib/content.ts` の `TERMS_VERSION` も合わせて変える）。

## RPC（クライアントから `supabase.rpc()` で呼ぶ）

| 関数 | 誰が | 内容 |
|---|---|---|
| `book_slot(p_slot_id, p_offer_id, p_message, p_place)` | 学ぶ側 | 枠を予約し、チケットを1枚仮押さえする。`p_place` は枠の候補から選んだ場所（候補が1つなら省略可）。予約IDを返す |
| `cancel_booking(p_booking_id, p_reason)` | 当事者 | キャンセルして学ぶ側に返却する。学ぶ側からなら枠を戻し、教える側からなら枠も取り消す |
| `complete_booking(p_booking_id, p_thanks)` | 学ぶ側 | 開始後に完了にする。教える側に+1 |
| `send_thanks(p_booking_id, p_thanks)` | 学ぶ側 | 完了した予約に、後からお礼コメントを送る |
| `claim_monthly_grant()` | 全員 | 毎月の配布を受け取る。**ログインのたびに呼んでよい**（月1回だけ有効で、受け取った枚数を返す） |

`book_slot` がチェックしていること：ログイン済み・停止中でない・プロフィール登録済み・枠が空いている・自分の枠ではない・締め切り（開始1時間前）より前・カードと枠が同じ教える人のもの・枠の長さが足りる・ブロック関係にない・同じ時間帯に別の予約がない・残高が1枚以上・場所が枠の候補に含まれている。

**異分野の判定**：予約した時点で、学ぶ側と教える側のプロフィールの**学部（`faculty_id`）または分野（`field_code`）**が違えば `is_cross_field = true` になります。

## 内部の処理（`private` スキーマ。APIからは呼べない）

- `handle_new_user`：`auth.users` への登録時に、ドメインが許可リストにあるかを確認し、プロフィール・財布・初期チケット3枚を作る
- `guard_email_change`：学外のアドレスへのメール変更を拒否する
- `auto_complete_bookings()`：終了から48時間たった予約を自動で完了にする（pg_cron で毎時実行）
- `app_config`：チケットの数値（初期付与・毎月の配布・上限・締め切り・自動完了までの時間）
- `kpi_weekly`：週ごとのKPI（完了数・異分野の比率・キャンセル率・「学部のしくみ」の完了数・お礼コメントの数）

## SQL の実行チェック

`checks/migrations.sql` の中身を SQL Editor に貼って実行すると、マイグレーションと初期データ、pg_cron のジョブが実行済みかを ✅ / ❌ の一覧で表示します（何も書き換えません）。❌ の行のファイルを、上から順に実行してください。新しいマイグレーションを足したら、このチェックにも1行足します。

## セットアップ手順

1. **Supabaseのプロジェクトを作り、拡張機能を有効にする**
   ダッシュボードの Database → Extensions で `pg_cron` を有効にする（自動完了に使う）。`btree_gist` はマイグレーションが有効にする。

2. **マイグレーションを適用する**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
   ```bash
   supabase db push
   ```
   pg_cron を後から有効にした場合は、SQLエディタで次を実行する。
   ```sql
   select cron.schedule('campus-cross-auto-complete', '7 * * * *', 'select private.auto_complete_bookings()');
   ```

3. **大学のドメインと学部を登録する**
   広島大学用の初期データ `seeds/hiroshima-u.sql` の中身を、SQLエディタに貼り付けて実行する。何度実行しても重複しない。
   - 許可するドメイン：`hiroshima-u.ac.jp`（サブドメインも自動で許可される）
   - 学部：12学部と、それぞれの代表的な分野（`field_code`。プロフィールの初期値に使う）

   他大学を追加するときは、同じ形式で `seeds/<大学>.sql` を作る。

4. **メール認証を設定する**
   - Authentication → Providers → Email：メールでのログインを有効にする
   - Authentication → Emails → Templates：**「Confirm signup」と「Magic Link」の両方**の本文に `{{ .Token }}`（6桁のコード）を入れる。初めての人には「Confirm signup」、2回目以降の人には「Magic Link」が送られるため、片方だけだとコードが届かない人が出る。例：
     ```html
     <h2>Campus-Cross ログインコード</h2>
     <p>コード: <strong>{{ .Token }}</strong></p>
     <p>心当たりがない場合は、このメールを無視してください。</p>
     ```
   - Authentication → URL Configuration：Site URL に本番のURL（Vercel のドメイン）を入れる
   - Authentication → SMTP Settings：**独自SMTP（Resendなど）を設定する**。標準の送信は上限がかなり低く、本番では足りない
   - 大学のメールで実際に受信できるか（迷惑メールに入らないか）を必ず確認する

5. **フロントエンド側でもドメインを事前にチェックする**
   ドメインのチェックはDBのトリガーが最後の砦です。トリガーで拒否されると、Supabase Auth は分かりにくいエラー（`Database error saving new user`）を返すため、フォームでも同じドメインを先にチェックして、分かりやすいメッセージを出してください。

## 数値を調整する

```sql
update private.app_config set
  initial_grant       = 3,
  monthly_grant       = 1,
  monthly_grant_cap   = 5,
  booking_lead_time   = '1 hour',
  auto_complete_after = '48 hours';
```

## KPIを見る

```sql
select * from private.kpi_weekly;
```

## 通知メール

予約・キャンセル・完了の通知は、Next.js のサーバー側（Server Action）で RPC が成功した後に、Resend などから `profile_private.contact_email`（未登録なら大学のメール）へ送る想定です。DBからは直接メールを送りません。
