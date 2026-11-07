import { Gift } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { AppHeader } from "@/components/layout/app-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, profile } = await requireOnboarded();

  // 毎月の配布（月1回だけ有効。何度呼んでも重複しない）
  const { data: granted } = await supabase.rpc("claim_monthly_grant");
  const [{ data: wallet }, { fields }] = await Promise.all([
    supabase.from("wallets").select("balance").single(),
    loadMasters(supabase),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        fields={fields}
        balance={wallet?.balance ?? 0}
        user={{ id: profile.id, name: profile.display_name }}
      />
      {Number(granted) > 0 && (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4">
          <p role="status" className="flex items-center gap-2 rounded-md bg-success-soft px-4 py-3 text-sm text-success">
            <Gift className="size-5 shrink-0" aria-hidden />
            今月のチケットを{Number(granted)}枚受け取りました。気になるテーマを探してみましょう。
          </p>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">{children}</main>
      <SiteFooter loggedIn />
      <MobileTabBar />
    </div>
  );
}
