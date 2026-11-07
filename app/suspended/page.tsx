import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Ban, Clock } from "lucide-react";
import { getCurrentMember } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "ご利用の停止について" };

export default async function SuspendedPage() {
  const { profile } = await getCurrentMember();
  if (profile.moderation_status === "active") redirect("/");
  const banned = profile.moderation_status === "banned";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <Logo />
      <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <span className={`flex size-14 items-center justify-center rounded-full ${banned ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`} aria-hidden>
          {banned ? <Ban className="size-7" /> : <Clock className="size-7" />}
        </span>
        <h1 className="mt-4 text-xl">{banned ? "このアカウントは永久に利用停止されています" : "このアカウントは一時停止中です"}</h1>
        <p className="mt-3 text-sm text-text-sub">
          {banned
            ? "利用規約・安全ガイドラインに反する行為が確認されたため、アカウントを永久に凍結しました。同じ大学メールアドレスで登録し直すことはできません。悪質なケースは、規約に基づき大学の関係部署に通報しています。"
            : "あなたに関する通報を運営が確認しています。確認が終わるまで、予約・カードの公開・枠の登録はできません。確認の結果、規約違反が認められた場合は永久に利用停止となります。"}
        </p>
      </div>
      <form action="/auth/signout" method="post">
        <button type="submit" className={buttonClass("outline", "md", "w-full")}>ログアウト</button>
      </form>
    </main>
  );
}
