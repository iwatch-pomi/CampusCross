import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <p className="text-6xl font-bold text-primary-vivid" aria-hidden>404</p>
      <h1 className="text-xl">ページが見つかりません</h1>
      <p className="text-sm text-text-sub">削除されたか、見る権限がないページです。</p>
      <ButtonLink href="/" variant="pill">ホームへ戻る</ButtonLink>
    </main>
  );
}
