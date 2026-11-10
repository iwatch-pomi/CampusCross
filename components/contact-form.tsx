"use client";

import { useActionState, useState } from "react";
import { Siren } from "lucide-react";
import { submitInquiry } from "@/app/contact/actions";
import { INQUIRY_CATEGORIES } from "@/lib/inquiry";
import { FormMessage, SubmitButton } from "./form-bits";
import { Field, INPUT } from "./ui";

export function ContactForm({ loggedIn, defaultCategory }: { loggedIn: boolean; defaultCategory?: string }) {
  const [state, action] = useActionState(submitInquiry, undefined);
  const [category, setCategory] = useState(defaultCategory ?? "");
  // 送信できたら、入力欄を空にするために form を作り直す
  const [round, setRound] = useState(0);
  const [lastOk, setLastOk] = useState<typeof state>(undefined);
  if (state?.ok && state !== lastOk) {
    setLastOk(state);
    setRound((r) => r + 1);
  }

  return (
    <form key={round} action={action} className="space-y-4">
      <Field label="種類" htmlFor="category" required>
        <select id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
          <option value="" disabled>選んでください</option>
          {INQUIRY_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </Field>

      {category === "safety" && (
        <p className="flex gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger">
          <Siren className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            いま身の危険を感じているときは、ためらわず110番や大学の窓口に連絡してください。
            予約の相手とのトラブルは、予約の画面の「通報する」からも送れます（運営がすぐに確認します）。
          </span>
        </p>
      )}

      {!loggedIn && (
        <Field label="返信を受け取るメールアドレス" htmlFor="reply_email" required hint="大学のメールでなくてもかまいません。返信以外には使いません">
          <input id="reply_email" name="reply_email" type="email" required autoComplete="email" inputMode="email" maxLength={254} className={INPUT} />
        </Field>
      )}

      <Field label="内容" htmlFor="body" required hint="いつ・どの画面で・何が起きたかを書いてもらえると、早く答えられます">
        <textarea id="body" name="body" rows={6} required minLength={5} maxLength={2000} className={INPUT} />
      </Field>

      {/* 人には見えない入力欄（機械的な送信よけ） */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="送信中…">送信する</SubmitButton>
    </form>
  );
}
