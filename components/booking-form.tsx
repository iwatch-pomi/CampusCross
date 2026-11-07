"use client";

import { useActionState } from "react";
import { bookSlot } from "@/app/(app)/offers/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { Field, INPUT } from "./ui";

export type SlotOption = { id: string; label: string; place: string; online: boolean };

export function BookingForm({
  offerId,
  slots,
  balance,
}: {
  offerId: string;
  slots: SlotOption[];
  balance: number;
}) {
  const [state, action] = useActionState(bookSlot, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="offer_id" value={offerId} />
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium text-stone-800">日時を選ぶ</legend>
        {slots.map((s, i) => (
          <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-300 bg-white p-3 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
            <input type="radio" name="slot_id" value={s.id} defaultChecked={i === 0} required className="mt-1 size-4 accent-indigo-600" />
            <span className="text-sm">
              <span className="block font-semibold text-stone-900">{s.label}</span>
              <span className="block text-stone-600">{s.online ? "オンライン" : "対面"}：{s.place}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label="ひとこと（任意）" htmlFor="message" hint="あなたの分野と、聞きたいことを1〜2行で。相手が準備しやすくなります">
        <textarea id="message" name="message" rows={3} maxLength={300} placeholder="生物生産学部です。培養データを機械学習で扱えるか知りたいです" className={INPUT} />
      </Field>

      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="予約中…" variant="primary">
        チケット1枚で予約する（残り{balance}枚）
      </SubmitButton>
      <p className="text-center text-xs text-stone-500">承認待ちはありません。予約するとすぐに確定します。キャンセルするとチケットは戻ります。</p>
    </form>
  );
}
