"use client";

import { useActionState, useState } from "react";
import { createSlot } from "@/app/(app)/slots/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { PlaceFields } from "./place-fields";
import { Field, INPUT } from "./ui";
import type { MeetingPlace } from "@/lib/types";

/** 1回だけの枠（毎週の枠は WeeklyHoursForm） */
export function SlotForm({ today }: { today: string }) {
  const [state, action] = useActionState(createSlot, undefined);
  const [places, setPlaces] = useState<MeetingPlace[]>(["library"]);
  // 登録できたら form を作り直す（送信後に React が form を初期化すると、場所のチェックと選択がずれるため）。
  // 選んだ場所はそのまま残す
  const [round, setRound] = useState(0);
  const [lastOk, setLastOk] = useState<typeof state>(undefined);
  if (state?.ok && state !== lastOk) {
    setLastOk(state);
    setRound((r) => r + 1);
  }

  return (
    <form key={round} action={action} className="space-y-4">
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
      </div>

      <PlaceFields places={places} onChange={setPlaces} />

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="登録中…">枠を登録する</SubmitButton>
    </form>
  );
}
