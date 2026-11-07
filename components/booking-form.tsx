"use client";

import { useActionState } from "react";
import { MapPin, Video } from "lucide-react";
import { bookSlot } from "@/app/(app)/offers/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE, Field, INPUT } from "./ui";

export type SlotOption = { id: string; label: string; place: string; online: boolean };

export function BookingForm({ offerId, slots, balance }: { offerId: string; slots: SlotOption[]; balance: number }) {
  const [state, action] = useActionState(bookSlot, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="offer_id" value={offerId} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">日時をえらぶ</legend>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {slots.map((s, i) => (
            <label key={s.id} className={`${CHOICE} flex-row items-start gap-3`}>
              <input type="radio" name="slot_id" value={s.id} defaultChecked={i === 0} required className="mt-1 size-4 accent-primary" />
              <span>
                <span className="block font-bold">{s.label}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-text-sub">
                  {s.online ? <Video className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
                  {s.online ? "オンライン" : "対面"}：{s.place}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="ひとこと（任意）" htmlFor="message" hint="あなたの分野と、聞きたいことを1〜2行で">
        <textarea id="message" name="message" rows={3} maxLength={300} placeholder="生物生産学部です。培養データを機械学習で扱えるか知りたいです" className={INPUT} />
      </Field>

      <FormMessage state={state} />
      <SubmitButton variant="accent" size="lg" className="w-full" pendingText="予約中…">
        チケット1枚で予約する
      </SubmitButton>
      <p className="text-center text-xs text-text-sub">
        いまの残り {balance}枚。承認待ちなしで確定し、キャンセルすると戻ります。
      </p>
    </form>
  );
}
