"use client";

import { useActionState, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createSlot } from "@/app/(app)/slots/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE, Field, INPUT } from "./ui";
import { PLACE_ORDER, PLACES } from "@/lib/safety";
import type { MeetingPlace } from "@/lib/types";

export function SlotForm({ today }: { today: string }) {
  const [state, action] = useActionState(createSlot, undefined);
  const [place, setPlace] = useState<MeetingPlace>("library");

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="日付" htmlFor="date" required>
          <input id="date" name="date" type="date" required min={today} defaultValue={today} className={INPUT} />
        </Field>
        <Field label="開始時刻" htmlFor="time" required>
          <input id="time" name="time" type="time" required step={300} defaultValue="12:20" className={INPUT} />
        </Field>
        <Field label="長さ" htmlFor="minutes" hint="1回は最長30分です">
          <select id="minutes" name="minutes" defaultValue="15" className={INPUT}>
            <option value="15">15分</option>
            <option value="30">30分</option>
          </select>
        </Field>
        <Field label="くり返し" htmlFor="repeat">
          <select id="repeat" name="repeat" defaultValue="1" className={INPUT}>
            <option value="1">この日だけ</option>
            <option value="4">毎週・4週分</option>
            <option value="8">毎週・8週分</option>
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">場所（学内の公共スペースか Zoom から選ぶ）</legend>
        <div className="grid grid-cols-2 gap-2">
          {PLACE_ORDER.map((p) => {
            const { label, hint, icon: Icon } = PLACES[p];
            return (
              <label key={p} className={`${CHOICE} gap-1`}>
                <input type="radio" name="place" value={p} checked={place === p} onChange={() => setPlace(p)} className="sr-only" />
                <span className="flex items-center gap-1.5 font-bold">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {label}
                </span>
                <span className="text-xs text-text-sub">{hint}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 flex gap-1.5 text-xs text-text-sub">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          密室にならないよう、研究室・個室・自宅などは選べません。
        </p>
      </fieldset>

      {place === "zoom" ? (
        <Field label="ZoomのURL" htmlFor="meeting_url" required hint="予約した人にだけ表示されます。一覧には出ません">
          <input id="meeting_url" name="meeting_url" type="url" required inputMode="url" placeholder="https://zoom.us/j/..." className={INPUT} />
        </Field>
      ) : (
        <Field label="待ち合わせの目印（任意）" htmlFor="place_note" hint="例：中央図書館1F 入口付近、窓側のテーブル（40文字まで）">
          <input id="place_note" name="place_note" maxLength={40} placeholder="入口すぐのテーブル" className={INPUT} />
        </Field>
      )}

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="登録中…">枠を登録する</SubmitButton>
    </form>
  );
}
