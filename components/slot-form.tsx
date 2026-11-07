"use client";

import { useActionState, useState } from "react";
import { createSlot } from "@/app/(app)/slots/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE, Field, INPUT } from "./ui";
import { LOCATION_SUGGESTIONS } from "@/lib/constants";

export function SlotForm({ today }: { today: string }) {
  const [state, action] = useActionState(createSlot, undefined);
  const [mode, setMode] = useState<"in_person" | "online">("in_person");

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="日付" htmlFor="date" required>
          <input id="date" name="date" type="date" required min={today} defaultValue={today} className={INPUT} />
        </Field>
        <Field label="開始時刻" htmlFor="time" required>
          <input id="time" name="time" type="time" required step={300} defaultValue="12:20" className={INPUT} />
        </Field>
        <Field label="長さ" htmlFor="minutes">
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
        <legend className="mb-2 text-sm font-bold">形式</legend>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(
            [
              ["in_person", "対面（おすすめ）"],
              ["online", "オンライン"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`${CHOICE} items-center text-center font-bold`}>
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label={mode === "online" ? "URL・つなぎ方" : "場所"}
        htmlFor="location"
        required
        hint={mode === "online" ? "予約した人にだけ見せたい場合は、当日までに別途連絡してください" : "はじめての相手とは、人目のある学内の場所がおすすめです"}
      >
        <input id="location" name="location" required maxLength={100} list="location-suggestions" placeholder={mode === "online" ? "Google Meet（URLは予約後に連絡）" : "中央図書館 入口付近"} className={INPUT} />
        <datalist id="location-suggestions">
          {LOCATION_SUGGESTIONS.map((l) => <option key={l} value={l} />)}
        </datalist>
      </Field>

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="登録中…">枠を登録する</SubmitButton>
    </form>
  );
}
