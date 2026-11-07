"use client";

import { useActionState } from "react";
import {
  blockUser,
  cancelBooking,
  completeBooking,
  reportUser,
  sendThanks,
} from "@/app/(app)/bookings/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { Field, INPUT } from "./ui";

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
      <SubmitButton className="w-full" pendingText="送信中…">完了にする（相手にチケット1枚）</SubmitButton>
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
      <SubmitButton variant="secondary" className="w-full" pendingText="送信中…">送る</SubmitButton>
    </form>
  );
}

export function CancelForm({ bookingId, label, hint }: { bookingId: string; label: string; hint: string }) {
  const [state, action] = useActionState(cancelBooking, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <details className="rounded-xl border border-stone-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium text-stone-700">{label}</summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="booking_id" value={bookingId} />
        <p className="text-xs text-stone-500">{hint}</p>
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
    <details className="rounded-xl border border-stone-200 bg-white p-3">
      <summary className="cursor-pointer text-sm text-stone-500">困ったことがあったら（通報・ブロック）</summary>
      <div className="mt-3 space-y-4">
        {reportState?.ok ? (
          <FormMessage state={reportState} />
        ) : (
          <form action={reportAction} className="space-y-2">
            <input type="hidden" name="booking_id" value={bookingId} />
            <select name="reason" aria-label="通報の理由" className={INPUT} defaultValue="solicitation">
              <option value="solicitation">勧誘・営業をされた</option>
              <option value="harassment">ハラスメント・不快な言動</option>
              <option value="no_show">来なかった</option>
              <option value="other">その他</option>
            </select>
            <textarea name="detail" rows={2} maxLength={1000} placeholder="くわしい状況（任意・運営だけが見ます）" aria-label="くわしい状況" className={INPUT} />
            <FormMessage state={reportState} />
            <SubmitButton variant="secondary" className="w-full" pendingText="送信中…">運営に通報する</SubmitButton>
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
