import Link from "next/link";
import { SITE } from "@/lib/content";
import { Logo } from "./logo";

/** stickyBar: 画面下に固定バーがあるときは、その分だけ下に余白を空ける */
export function SiteFooter({ loggedIn, stickyBar = false }: { loggedIn: boolean; stickyBar?: boolean }) {
  return (
    <footer className="border-t border-border bg-bg-section">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Logo href={loggedIn ? "/" : "/login"} />
          <p className="max-w-md text-sm text-text-sub">{SITE.description}</p>
          <p className="text-xs text-text-sub">
            {SITE.scope}／チケットは換金・譲渡できません
          </p>
        </div>
        {!loggedIn && (
          <nav aria-label="フッター">
            <Link href="/guidelines" className="flex min-h-11 items-center text-sm text-text-sub hover:text-primary">利用規約・安全ガイドライン</Link>
            <Link href="/contact" className="flex min-h-11 items-center text-sm text-text-sub hover:text-primary">お問い合わせ</Link>
          </nav>
        )}
        {loggedIn && (
          <nav aria-label="フッター">
            <ul className="grid grid-cols-2 gap-x-8 text-sm">
              {[
                ["/search", "さがす"],
                ["/offers/new", "カードを出す"],
                ["/slots", "空き枠"],
                ["/me", "マイページ"],
                ["/guidelines", "利用規約・安全ガイドライン"],
                ["/contact", "お問い合わせ"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-11 items-center text-text-sub hover:text-primary">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <p className={`pb-28 text-center text-xs text-text-sub ${stickyBar ? "" : "md:pb-6"}`}>© {SITE.name}</p>
    </footer>
  );
}
