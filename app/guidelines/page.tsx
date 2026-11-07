import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Siren } from "lucide-react";
import { SAFETY_SYSTEM, SITE, TERMS_VERSION } from "@/lib/content";
import { Logo } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "利用規約・安全ガイドライン" };

/*
 * 利用規約・安全ガイドライン（未ログインでも読める）。
 * 内容を変えたら lib/content.ts の TERMS_VERSION と DB の app_config.terms_version を上げ、全員に再同意してもらう。
 * ※ 公開前に、大学（学内起業支援センター等）と法務の確認を受けること。
 */
const PROHIBITED = [
  "出会い・交際を目的とした利用、食事・飲み・デートなど個人的な誘い",
  "宗教・ビジネス（マルチ商法など）・政治・団体への勧誘、営業・宣伝",
  "ハラスメント、差別的・威圧的な言動、身体への接触",
  "連絡先・SNSアカウントのしつこい要求、本名・住所などの詮索",
  "決めた場所（学食・図書館フリースペース・キャンパス内カフェ・Zoom）以外への誘導",
  "他人へのなりすまし、虚偽の通報",
  "チケットの売買・換金、金銭や物品のやり取り",
];

export default function GuidelinesPage() {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-2">
          <Logo href="/" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <div>
          <p className="text-sm font-bold text-primary">{SITE.name}</p>
          <h1 className="mt-1 text-3xl">利用規約・安全ガイドライン</h1>
          <p className="mt-2 text-sm text-text-sub">版：{TERMS_VERSION}　／　{SITE.scope}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl">1. このサービスについて</h2>
          <p>
            {SITE.name}は、大学が発行したメールアドレスで本人確認をした学生どうしが、15〜30分だけ専門を教え合うサービスです。
            お金のやり取りはなく、チケット（換金・譲渡不可）で回します。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl">2. 安全・防犯のしくみ</h2>
          {SAFETY_SYSTEM.map((c) => (
            <div key={c.key} className="rounded-lg border border-border bg-surface p-5 shadow-card">
              <p className="text-xs font-bold text-point">{c.label}</p>
              <h3 className="text-lg">{c.title}</h3>
              <ul className="mt-3 space-y-3">
                {c.items.map((i) => (
                  <li key={i.title} className="flex gap-2">
                    <ShieldCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="font-bold">{i.title}</span>
                      <span className="block text-sm text-text-sub">{i.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl">3. 禁止事項</h2>
          <ul className="list-inside list-disc space-y-1">
            {PROHIBITED.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl">4. 違反したときの措置</h2>
          <ol className="list-inside list-decimal space-y-2">
            <li>
              <span className="font-bold">永久凍結：</span>
              ハラスメント・勧誘・出会い目的の行為が運営の確認で1度でも認められた場合、猶予なしでアカウントを永久に凍結します。
              入っている予約は取り消され、同じメールアドレスでは登録し直せません。
            </li>
            <li>
              <span className="font-bold">一時停止：</span>
              別々の2人以上から深刻な内容の通報・安全レビューが届いた場合、運営の確認が終わるまで自動で一時停止します
              （予約・カードの公開・枠の登録ができなくなり、カードは一覧から消えます）。
            </li>
            <li>
              <span className="font-bold">大学への通報：</span>
              悪質なケースは、大学の関係部署（学生支援・ハラスメント相談などの窓口）に通報します。
              そのとき、対象者の大学メールアドレス・表示名・学部・学年・通報や安全レビューの内容・日時を大学に提供します。
            </li>
          </ol>
          <p className="text-sm text-text-sub">虚偽の通報も禁止事項です。運営は、通報と安全レビューの内容、予約の記録をもとに事実を確認します。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl">5. 個人情報の取り扱い</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>他の利用者に見えるのは、ニックネーム・学部・学年・分野・自己紹介・あなたのカードだけです</li>
            <li>大学メールアドレス・通知用メールアドレス・性別は、本人と運営だけが見られます</li>
            <li>性別は「同性限定リクエスト」の判定にだけ使います</li>
            <li>安全レビューと通報の内容は、相手には見えず、運営だけが確認します</li>
            <li>上の「大学への通報」の場合に限り、必要な範囲の情報を大学に提供します（登録時の同意に基づきます）</li>
            <li>カードもプロフィールも、学外には公開しません</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-lg border-2 border-danger/30 bg-danger-soft p-5">
          <h2 className="flex items-center gap-2 text-xl text-danger">
            <Siren className="size-5" aria-hidden />
            6. 困ったとき・危ないと感じたとき
          </h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>その場ですぐに会話を終えて、人の多い場所へ移動してください。断って構いません</li>
            <li>身の危険を感じたら、警察（110番）や大学の窓口・警備にすぐ連絡してください</li>
            <li>あとから、予約の画面の「困ったことがあったら」から運営に通報・相手をブロックできます</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl">7. 規約の変更</h2>
          <p>この規約を変えたときは、次にログインしたときにもう一度同意していただきます。</p>
        </section>

        <p>
          <Link href="/login" className="font-bold text-primary underline">トップへ戻る</Link>
        </p>
      </main>
      <SiteFooter loggedIn={false} />
    </>
  );
}
