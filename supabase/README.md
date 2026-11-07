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

## RPC（クライアントから `supabase.rpc()` で呼ぶ）

| 関数 | 誰が | 内容 |
|---|---|---|
| `book_slot(p_slot_id, p_offer_id, p_message)` | 学ぶ側 | 枠を予約し、チケットを1枚仮押さえする。予約IDを返す |
| `cancel_booking(p_booking_id, p_reason)` | 当事者 | キャンセルして学ぶ側に返却する。学ぶ側からなら枠を戻し、教える側からなら枠も取り消す |
| `complete_booking(p_booking_id, p_thanks)` | 学ぶ側 | 開始後に完了にする。教える側に+1 |
| `send_thanks(p_booking_id, p_thanks)` | 学ぶ側 | 完了した予約に、後からお礼コメントを送る |
| `claim_monthly_grant()` | 全員 | 毎月の配布を受け取る。**ログインのたびに呼んでよい**（月1回だけ有効で、受け取った枚数を返す） |

`book_slot` がチェックしていること：ログイン済み・停止中でない・プロフィール登録済み・枠が空いている・自分の枠ではない・締め切り（開始1時間前）より前・カードと枠が同じ教える人のもの・枠の長さが足りる・ブロック関係にない・同じ時間帯に別の予約がない・残高が1枚以上。

**異分野の判定**：予約した時点で、学ぶ側と教える側のプロフィールの**学部（`faculty_id`）または分野（`field_code`）**が違えば `is_cross_field = true` になります。

## 内部の処理（`private` スキーマ。APIからは呼べない）

- `handle_new_user`：`auth.users` への登録時に、ドメインが許可リストにあるかを確認し、プロフィール・財布・初期チケット3枚を作る
- `guard_email_change`：学外のアドレスへのメール変更を拒否する
- `auto_complete_bookings()`：終了から48時間たった予約を自動で完了にする（pg_cron で毎時実行）
- `app_config`：チケットの数値（初期付与・毎月の配布・上限・締め切り・自動完了までの時間）
- `kpi_weekly`：週ごとのKPI（完了数・異分野の比率・キャンセル率・「学部のしくみ」の完了数・お礼コメントの数）

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
