import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, profile } = await requireOnboarded();

  // 毎月の配布（月1回だけ有効。何度呼んでも重複しない）
  const { data: granted } = await supabase.rpc("claim_monthly_grant");
  const { data: wallet } = await supabase.from("wallets").select("balance").single();

  return (
    <div className="min-h-dvh pb-20 sm:pb-8">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-bold tracking-tight text-indigo-700">
            Campus-Cross
          </Link>
          <div className="hidden sm:block">
            <NavLinks />
          </div>
          <Link
            href="/me#tickets"
            className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200"
            aria-label={`チケット残高 ${wallet?.balance ?? 0}枚`}
          >
            チケット {wallet?.balance ?? 0}枚
          </Link>
        </div>
      </header>

      {Number(granted) > 0 && (
        <div className="mx-auto mt-3 max-w-2xl px-4">
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            今月のチケットを{Number(granted)}枚受け取りました。{profile.display_name}さん、気になるテーマを探してみましょう。
          </p>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white sm:hidden" aria-label="メインメニュー">
        <NavLinks mobile />
      </nav>
    </div>
  );
}
