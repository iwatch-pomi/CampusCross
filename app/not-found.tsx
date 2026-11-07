import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm font-semibold text-indigo-600">Campus-Cross</p>
      <h1 className="mt-2 text-xl font-bold">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-stone-600">削除されたか、見る権限がないページです。</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-indigo-700 underline">ホームへ戻る</Link>
    </main>
  );
}
