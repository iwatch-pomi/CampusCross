"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { acceptReschedule, declineReschedule, proposeReschedule } from "@/app/(app)/bookings/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE_ROW, Field, INPUT } from "./ui";

type Option = { id: string; label: string };

/** 話す人：都合が悪くなったときに、別の日時を提案する */
export function ProposeRescheduleForm({
  bookingId,
  slotOptions,
  today,
  durationMin,
}: {
  bookingId: string;
  slotOptions: Option[];
  today: string;
  durationMin: number;
}) {
  const [state, action] = useActionState(proposeReschedule, undefined);
  const [rows, setRows] = useState(slotOptions.length > 0 ? 0 : 1);

  return (
    <details className="group rounded-lg border border-border bg-surface p-4 shadow-card open:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-primary">
        <CalendarClock className="size-5" aria-hidden />
        この日時の都合が悪くなった → 延期を提案する
      </summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="booking_id" value={bookingId} />
        <p className="text-sm text-text-sub">
          候補を1〜3つ出すと、相手がその中から選びます。どれも合わなければ予約は取り消され、チケットは相手に戻ります。元の日時までに返事がない場合も、自動で取り消されます。
        </p>

        {slotOptions.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold">自分の空き枠から選ぶ</legend>
            <div className="space-y-2">
              {slotOptions.map((o) => (
                <label key={o.id} className={`${CHOICE_ROW} items-center gap-3`}>
                  <input type="checkbox" name="slot_ids" value={o.id} className="size-4 accent-primary" />
                  <span className="font-bold">{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-bold">新しい日時を入れる（{durationMin}分・場所は今の予約と同じ）</legend>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor={`rs-date-${i}`}>日付</label>
              <input id={`rs-date-${i}`} name="date" type="date" min={today} className={INPUT} />
              <label className="sr-only" htmlFor={`rs-time-${i}`}>開始時刻</label>
              <input id={`rs-time-${i}`} name="time" type="time" step={300} className={INPUT} />
            </div>
          ))}
          {rows < 3 && (
            <button
              type="button"
              onClick={() => setRows((r) => r + 1)}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
            >
              <Plus className="size-4" aria-hidden />
              日時を追加
            </button>
          )}
        </fieldset>

        <Field label="ひとこと（任意）" htmlFor="rs-message" hint="例：ゼミの発表が入ってしまいました。ごめんなさい">
          <textarea id="rs-message" name="message" rows={2} maxLength={300} className={INPUT} />
        </Field>

        <FormMessage state={state} />
        <SubmitButton className="w-full" pendingText="送信中…">この候補で延期を提案する</SubmitButton>
      </form>
    </details>
  );
}

/** 予約した人：延期の候補から選ぶ、またはどれも合わないと返事する */
export function RespondRescheduleForms({ bookingId, proposalId, options }: { bookingId: string; proposalId: string; options: Option[] }) {
  const [acceptState, acceptAction] = useActionState(acceptReschedule, undefined);
  const [declineState, declineAction] = useActionState(declineReschedule, undefined);

  return (
    <div className="space-y-4">
      <form action={acceptAction} className="space-y-3">
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="proposal_id" value={proposalId} />
        <fieldset>
          <legend className="mb-2 text-sm font-bold">新しい日時をえらぶ</legend>
          <div className="space-y-2">
            {options.map((o, i) => (
              <label key={o.id} className={`${CHOICE_ROW} items-center gap-3`}>
                <input type="radio" name="option_id" value={o.id} defaultChecked={i === 0} required className="size-4 accent-primary" />
                <span className="font-bold">{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <FormMessage state={acceptState} />
        <SubmitButton variant="accent" className="w-full" pendingText="変更中…">この日時に変更する</SubmitButton>
      </form>

      <form action={declineAction} className="space-y-2 border-t border-border pt-4">
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="proposal_id" value={proposalId} />
        <FormMessage state={declineState} />
        <SubmitButton variant="outline" className="w-full" pendingText="送信中…">
          どれも都合が合わない
        </SubmitButton>
        <p className="text-center text-xs text-text-sub">予約は取り消され、チケットはあなたに戻ります</p>
      </form>
    </div>
  );
}
