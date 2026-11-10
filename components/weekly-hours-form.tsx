"use client";

import { useActionState, useState } from "react";
import { createWeeklyHours } from "@/app/(app)/slots/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { PlaceFields } from "./place-fields";
import { CHOICE } from "./ui";
import { TimeRangeFields } from "./time-range-fields";
import { WEEKDAYS } from "@/lib/format";
import type { MeetingPlace } from "@/lib/types";

/** 毎週のオフィスアワーを追加する（曜日はいくつでも） */
export function WeeklyHoursForm() {
  const [state, action] = useActionState(createWeeklyHours, undefined);
  const [places, setPlaces] = useState<MeetingPlace[]>(["library"]);
  const [round, setRound] = useState(0);
  const [lastOk, setLastOk] = useState<typeof state>(undefined);
  if (state?.ok && state !== lastOk) {
    setLastOk(state);
    setRound((r) => r + 1);
  }

  return (
    <form key={round} action={action} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">曜日（いくつでも）</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((label, i) => (
            <label key={label} className={`${CHOICE} min-h-11 items-center p-0 font-bold ${i >= 5 ? "text-accent" : ""}`}>
              <input type="checkbox" name="weekday" value={i + 1} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <TimeRangeFields idPrefix="w-" />

      <PlaceFields places={places} onChange={setPlaces} idPrefix="w-" />

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="登録中…">毎週の時間を登録する</SubmitButton>
    </form>
  );
}
