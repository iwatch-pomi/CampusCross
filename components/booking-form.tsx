"use client";

import { useActionState, useState } from "react";
import { MapPin, Video } from "lucide-react";
import { bookSlot } from "@/app/(app)/offers/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE_ROW, Field, INPUT } from "./ui";
import { PLACES, placesLabel, slotModes } from "@/lib/safety";
import type { MeetingPlace } from "@/lib/types";

export type SlotOption = { id: string; label: string; places: MeetingPlace[]; note: string | null };

function modeLabel(places: MeetingPlace[]): string {
  const { inPerson, online } = slotModes(places);
  return inPerson && online ? "対面・オンライン" : online ? "オンライン" : "対面";
}

export function BookingForm({ offerId, slots, balance }: { offerId: string; slots: SlotOption[]; balance: number }) {
  const [state, action] = useActionState(bookSlot, undefined);
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const selected = slots.find((s) => s.id === slotId) ?? slots[0];
  const [place, setPlace] = useState<MeetingPlace | "">(selected?.places.length === 1 ? selected.places[0] : "");

  const chooseSlot = (s: SlotOption) => {
    setSlotId(s.id);
    // 候補が1つならそれに決める。前に選んだ場所が新しい枠にもあれば、そのまま残す
    setPlace((cur) => (s.places.length === 1 ? s.places[0] : cur && s.places.includes(cur) ? cur : ""));
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="offer_id" value={offerId} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">日時をえらぶ</legend>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {slots.map((s) => (
            <label key={s.id} className={`${CHOICE_ROW} items-start gap-3`}>
              <input
                type="radio"
                name="slot_id"
                value={s.id}
                checked={slotId === s.id}
                onChange={() => chooseSlot(s)}
                required
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block font-bold">{s.label}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-text-sub">
                  {slotModes(s.places).inPerson ? <MapPin className="size-3.5 shrink-0" aria-hidden /> : <Video className="size-3.5 shrink-0" aria-hidden />}
                  {modeLabel(s.places)}：{placesLabel({ places: s.places, place_note: s.note })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {selected && selected.places.length > 1 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">場所をえらぶ</legend>
          <div className="grid grid-cols-2 gap-2">
            {selected.places.map((p) => {
              const { label, icon: Icon } = PLACES[p];
              return (
                <label key={p} className={`${CHOICE_ROW} items-center gap-1.5 text-sm font-bold`}>
                  <input type="radio" name="place" value={p} checked={place === p} onChange={() => setPlace(p)} required className="sr-only" />
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                  {label}
                </label>
              );
            })}
          </div>
          {place === "zoom" && <p className="mt-2 text-xs text-text-sub">ZoomのURLは、予約したあとに予約の画面に表示されます。</p>}
        </fieldset>
      ) : (
        selected && <input type="hidden" name="place" value={selected.places[0]} />
      )}

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
