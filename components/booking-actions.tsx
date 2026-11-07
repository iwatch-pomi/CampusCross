"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  blockUser,
  cancelBooking,
  completeBooking,
  reportUser,
  sendThanks,
  submitSafetyReview,
} from "@/app/(app)/bookings/actions";
import { FEELING_LABEL, REPORT_REASONS, REVIEW_FLAGS } from "@/lib/safety";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE, Field, INPUT } from "./ui";

export function CompleteForm({ bookingId, teacherName }: { bookingId: string; teacherName: string }) {
  const [state, action] = useActionState(completeBooking, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <Field label={`${teacherName}さんへのお礼コメント（任意）`} htmlFor="thanks" hint="相手のマイページに表示されます。実績として使ってもらえます">
        <textarea id="thanks" name="thanks" rows={3} maxLength={300} placeholder="研究の話がすごく面白かったです。〇〇の考え方は自分の分野でも使えそう！" className={INPUT} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="accent" size="lg" className="w-full" pendingText="送信中…">完了にする（相手にチケット1枚）</SubmitButton>
    </form>
  );
}

export function ThanksForm({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(sendThanks, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <Field label="お礼コメントを送る" htmlFor="thanks">
        <textarea id="thanks" name="thanks" rows={3} maxLength={300} required className={INPUT} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="outline" className="w-full" pendingText="送信中…">送る</SubmitButton>
    </form>
  );
}

export function CancelForm({ bookingId, label, hint }: { bookingId: string; label: string; hint: string }) {
  const [state, action] = useActionState(cancelBooking, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <details className="rounded-lg border border-border bg-surface px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">{label}</summary>
      <form action={action} className="space-y-3 pb-4 pt-1">
        <input type="hidden" name="booking_id" value={bookingId} />
        <p className="text-xs text-text-sub">{hint}</p>
        <input name="reason" maxLength={200} placeholder="理由（任意・相手に伝わります）" aria-label="キャンセルの理由" className={INPUT} />
        <FormMessage state={state} />
        <SubmitButton variant="danger" className="w-full" pendingText="処理中…">{label}</SubmitButton>
      </form>
    </details>
  );
}

export function SafetyForms({ bookingId }: { bookingId: string }) {
  const [reportState, reportAction] = useActionState(reportUser, undefined);
  const [blockState, blockAction] = useActionState(blockUser, undefined);
  return (
    <details className="rounded-lg border border-border bg-surface px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm text-text-sub">困ったことがあったら（通報・ブロック）</summary>
      <div className="space-y-4 pb-4 pt-1">
        {reportState?.ok ? (
          <FormMessage state={reportState} />
        ) : (
          <form action={reportAction} className="space-y-2">
            <input type="hidden" name="booking_id" value={bookingId} />
            <select name="reason" aria-label="通報の理由" className={INPUT} defaultValue="dating">
              {REPORT_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <textarea name="detail" rows={2} maxLength={1000} placeholder="くわしい状況（任意・運営だけが見ます）" aria-label="くわしい状況" className={INPUT} />
            <FormMessage state={reportState} />
            <SubmitButton variant="outline" className="w-full" pendingText="送信中…">運営に通報する</SubmitButton>
          </form>
        )}
        {blockState?.ok ? (
          <FormMessage state={blockState} />
        ) : (
          <form action={blockAction}>
            <input type="hidden" name="booking_id" value={bookingId} />
            <FormMessage state={blockState} />
            <SubmitButton variant="danger" className="w-full" pendingText="処理中…">この相手をブロックする</SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}

/** 相互の安全レビュー。回答は相手には見えず、運営だけが確認する */
export function SafetyReviewForm({ bookingId, otherName }: { bookingId: string; otherName: string }) {
  const [state, action] = useActionState(submitSafetyReview, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <div>
        <h2 className="flex items-center gap-2 text-lg">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          安全レビュー
        </h2>
        <p className="mt-1 text-xs text-text-sub">
          {otherName}さんとのセッションはどうでしたか？ 回答は相手には表示されず、運営だけが確認します。不適切な行為の早期発見に使います。
        </p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">全体として</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(FEELING_LABEL) as (keyof typeof FEELING_LABEL)[]).map((f) => (
            <label key={f} className={`${CHOICE} items-center text-center text-xs font-bold`}>
              <input type="radio" name="feeling" value={f} required defaultChecked={f === "safe"} className="sr-only" />
              {FEELING_LABEL[f]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">気になったこと（あれば）</legend>
        <ul className="space-y-1">
          {REVIEW_FLAGS.map((f) => (
            <li key={f.code}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="flags" value={f.code} className="size-5 shrink-0 accent-primary" />
                {f.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Field label="運営に伝えたいこと（任意）" htmlFor="review-comment">
        <textarea id="review-comment" name="comment" rows={3} maxLength={1000} className={INPUT} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="primary" className="w-full" pendingText="送信中…">回答する</SubmitButton>
    </form>
  );
}
