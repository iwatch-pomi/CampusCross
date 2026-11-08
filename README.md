# Campus-Cross（キャンパス・クロス）

> 15分で、となりの学部へ。

学内メール認証にもとづき、学生同士が他学部の専門・研究・スキルを15〜30分で気軽に教え合う、お金をやり取りしない「ギブ＆テイク型」の異分野ナレッジ交換プラットフォームです。Phase 1 は広島大学（`@hiroshima-u.ac.jp`）で検証します。

- 教えると **+1枚**、教わると **−1枚**（チケット）
- 登録時に **3枚**、毎月 **1枚** を配布（残高5枚未満の人のみ）
- 教える側が **オフィスアワーの枠** を出し、学ぶ側がワンクリックで予約する
- 学内での **対面** を推す
- カードは **専門テーマ** と **学部のしくみ**（ゼミ・研究室の決まり方など）の2種類

## ドキュメント

- [サービス仕様書（学内相談用・安全・防犯システムを含む）](docs/SPEC.md)
- [プロダクト要件定義書（PRD）](docs/PRD.md)
- [Supabase のスキーマとセットアップ](supabase/README.md)

## 技術スタック

Next.js 16（App Router）／ Tailwind CSS 4 ／ Supabase（Auth・Postgres）／ Vercel

## 画面

| パス | 内容 |
|---|---|
| `/login` | 紹介ページ（LP）と、大学のメールアドレスで6桁のコードを受け取るログイン。未ログインで見られるのはここだけ |
| `/onboarding` | 初回のプロフィール登録（学部を選ぶと分野の初期値が入る） |
| `/` | ホーム。あいさつと次の予定、分野グリッド、「異分野のテーマ」「もうすぐ話せる」「他学部のしくみ」「新着」の横スクロール |
| `/search` | さがす。種類タブ、分野・学部・形式・時間・空き枠の絞り込み（SP はドロワー）、並び替え |
| `/offers/new`・`/offers/[id]/edit` | 募集カードの作成・編集（種類ごとのテンプレート付き） |
| `/offers/[id]` | カードの詳細と予約（空き枠を選んでチケット1枚で即確定） |
| `/slots` | オフィスアワーの枠の登録（毎週くり返しも可）・取り消し |
| `/bookings/[id]` | 予約の詳細。キャンセル、完了とお礼コメント、通報・ブロック |
| `/me` | 教えた実績とお礼コメント、これからの予約、自分のカード、チケットの履歴 |
| `/guidelines` | 利用規約・安全ガイドライン（未ログインでも読める） |
| `/suspended` | 一時停止中の人に表示する画面 |
| `/admin`・`/admin/users/[id]` | 運営用。通報・安全レビューの確認、一時停止・永久凍結、大学への通報の記録 |

## デザインシステム

- **トークン**：`app/styles/tokens.css` に色・角丸・影・余白をまとめています。Tailwind 標準のパレット・角丸・影は無効にしているので、画面はこのトークンしか使えません（`bg-blue-500` や `rounded-2xl` を書いても効きません）。メインカラーは `--color-primary` 系の3つを変えるだけで差し替わります。文字に使う色は白とのコントラスト比 4.5:1 以上（AA）にしてあります
- **文言・可変パラメータ**：サービス名、キャッチコピー、LP の文言は `lib/content.ts` に集約しています
- **分野のアイコンと色**：`lib/categories.tsx`
- **コンポーネント**：`components/ui`（ボタン、バッジ、イラストのアバター、空表示、読み込み中など）、`components/skill`（チケット型カード、横スクロール）、`components/category`、`components/marketing`（ヒーロー、POINT、数字、口コミ型カード）、`components/decor`（波線、浮かぶ円、手描き風の装飾）、`components/layout`
- **アクセシビリティ**：ボタン・リンクのタップ領域は 44px 以上、フォーカスリングあり。375 / 768 / 1280px で横スクロールが出ないことを確認しています
- **ダークモード**：構想では未定のため、トークン（`[data-theme="dark"]`）だけ用意しています

## ローカルで動かす

必要なもの：Node.js 20 以上、Docker（Supabase CLI がローカルの Supabase を起動するため）

1. 依存パッケージを入れる
   ```bash
   npm install
   ```
2. ローカルの Supabase を起動する。マイグレーションと広島大学の初期データ（ドメインと学部）が自動で入る
   ```bash
   npx supabase start
   ```
   データを作り直したいときは次を実行する。
   ```bash
   npx supabase db reset
   ```
   デザイン確認用のサンプル（9人・11枚のカード）を入れたいときは、次を実行する（**本番では実行しない**）。
   ```bash
   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seeds/demo.sql
   ```
3. `.env.example` を `.env.local` にコピーし、`supabase start` が表示した API URL と publishable（anon）キーを入れる
4. 開発サーバーを起動する
   ```bash
   npm run dev
   ```
   ログインコードのメールは、ローカルの Supabase に付属するメール確認画面（`supabase start` が表示する Mailpit の URL）で読めます。ローカルのメールテンプレートは `supabase/templates/otp.html` です。

## 運営の権限を付ける

運営用ページ（`/admin`）は、`profiles.is_admin` が true の人だけが使えます。Supabase の SQL エディタで付けます。

```sql
update public.profiles set is_admin = true
 where id = (select id from auth.users where email = 'あなたの大学メール');
```

## 本番に出す（Vercel）

> **本格公開の前に**：Phase 1 では、ログインコードのメールを専用の Gmail アカウントから送っています。本格的に公開する前に、独自ドメインを取って Resend などの送信サービスに切り替えてください（大学のメールで迷惑メールに入りにくくなります）。Supabase の Authentication → SMTP Settings を差し替えるだけで、アプリ側の変更は不要です。

1. [supabase/README.md](supabase/README.md) の手順で、本番の Supabase を設定する（マイグレーション、初期データ、メールテンプレート、独自SMTP）
2. Vercel にこのリポジトリをインポートし、`.env.example` の環境変数を設定する
   - `SUPABASE_SERVICE_ROLE_KEY` はサーバー側だけで使う（通知メールの宛先を読むため）。`NEXT_PUBLIC_` を付けないこと
   - 通知メールを送るなら `RESEND_API_KEY` と `NOTIFY_FROM` も設定する。未設定でも動き、通知は送られない
