import { LoginForm } from "./login-form";
import { allowedEmailDomains } from "@/lib/constants";

export default function LoginPage() {
  const domain = allowedEmailDomains()[0] ?? "ac.jp";
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-indigo-600">Campus-Cross</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">15分で、となりの学部へ。</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          学内の学生どうしで、専門を15〜30分だけ教え合う場所です。
          お金はかかりません。教えると1枚、教わると1枚のチケットが動きます。
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <LoginForm domainHint={domain} />
      </div>
      <p className="mt-6 text-center text-xs text-stone-500">
        登録すると、はじめにチケットを3枚受け取れます。
      </p>
    </main>
  );
}
