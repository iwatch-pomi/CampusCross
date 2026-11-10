"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createWeeklyHours, deleteWeeklyHour, updateWeeklyHour } from "@/app/(app)/slots/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { PlaceFields } from "./place-fields";
import { timeRange, WEEKDAYS } from "@/lib/format";
import { slotCount } from "@/lib/periods";
import { TimeRangeFields } from "./time-range-fields";
import { placesLabel } from "@/lib/safety";
import type { ActionState, MeetingPlace } from "@/lib/types";

export type WeeklyEntry = {
  id: string;
  weekday: number;
  start_time: string;
  /** 時間帯の終わり。空なら start_time からの1枠だけ */
  end_time: string | null;
  minutes: number;
  places: MeetingPlace[];
  place_note: string | null;
  meeting_url: string | null;
};

type Editing = { kind: "add"; weekday: number } | { kind: "edit"; id: string } | null;

/** 月〜日の週間表。曜日ごとに時間を追加・変更・削除できる */
export function WeeklySchedule({ entries }: { entries: WeeklyEntry[] }) {
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <ul className="divide-y divide-border">
      {WEEKDAYS.map((label, i) => {
        const weekday = i + 1;
        const items = entries.filter((e) => e.weekday === weekday);
        const weekend = weekday >= 6;
        return (
          <li key={label} className="py-3">
            <div className="flex gap-3">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  items.length ? "bg-primary text-on-primary" : weekend ? "bg-bg-section text-accent" : "bg-bg-section text-text-sub"
                }`}
              >
                {label}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                {items.length === 0 && editing?.kind !== "add" && <p className="pt-2 text-sm text-text-sub">なし</p>}
                {items.map((e) =>
                  editing?.kind === "edit" && editing.id === e.id ? (
                    <EntryForm key={e.id} weekday={weekday} entry={e} onDone={() => setEditing(null)} />
                  ) : (
                    <div key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-bg-section px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-bold">{entryLabel(e)}</span>
                        <span className="block truncate text-xs text-text-sub">{placesLabel(e)}</span>
                      </span>
                      <span className="flex shrink-0 items-center">
                        <button
                          type="button"
                          onClick={() => setEditing({ kind: "edit", id: e.id })}
                          className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-bold text-primary hover:bg-primary-soft"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          変更<span className="sr-only">（{label}曜 {timeRange(e.start_time, e.minutes)}）</span>
                        </button>
                        <form action={deleteWeeklyHour}>
                          <input type="hidden" name="id" value={e.id} />
                          <SubmitButton variant="ghost" pendingText="…" className="text-xs">
                            <Trash2 className="size-3.5" aria-hidden />
                            削除<span className="sr-only">（{label}曜 {timeRange(e.start_time, e.minutes)}）</span>
                          </SubmitButton>
                        </form>
                      </span>
                    </div>
                  ),
                )}
                {editing?.kind === "add" && editing.weekday === weekday ? (
                  <EntryForm weekday={weekday} onDone={() => setEditing(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: "add", weekday })}
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
                  >
                    <Plus className="size-4" aria-hidden />
                    {label}曜に時間を追加
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 1つの曜日の時間を追加・変更するフォーム */
function EntryForm({ weekday, entry, onDone }: { weekday: number; entry?: WeeklyEntry; onDone: () => void }) {
  // 保存できたらフォームを閉じる（結果は週間表に反映される）
  const [state, action] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await (entry ? updateWeeklyHour : createWeeklyHours)(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const [places, setPlaces] = useState<MeetingPlace[]>(entry?.places ?? ["library"]);
  const prefix = `${entry?.id ?? `new-${weekday}`}-`;

  return (
    <form action={action} className="space-y-4 rounded-md border border-primary/40 bg-surface p-4">
      <p className="text-sm font-bold">
        {WEEKDAYS[weekday - 1]}曜の時間を{entry ? "変更" : "追加"}
      </p>
      {entry ? <input type="hidden" name="id" value={entry.id} /> : <input type="hidden" name="weekday" value={weekday} />}
      <TimeRangeFields
        idPrefix={prefix}
        defaultStart={entry?.start_time.slice(0, 5)}
        defaultEnd={entry ? (entry.end_time?.slice(0, 5) ?? endOf(entry.start_time, entry.minutes)) : undefined}
        defaultMinutes={entry?.minutes}
      />
      <PlaceFields places={places} onChange={setPlaces} idPrefix={prefix} defaultNote={entry?.place_note} defaultUrl={entry?.meeting_url} />
      {entry && <p className="text-xs text-text-sub">変更すると、先の空き枠が新しい内容で作り直されます。予約が入っている枠と、休みにした日はそのままです。</p>}
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="保存中…">{entry ? "変更を保存" : "追加する"}</SubmitButton>
        <button type="button" onClick={onDone} className="min-h-11 rounded-md px-3 text-sm text-text-sub underline hover:text-primary">
          やめる
        </button>
      </div>
    </form>
  );
}

/** "12:20:00" + 15分 → "12:35" */
function endOf(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + minutes;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** 例：「10:30〜12:50（15分ずつ・9枠）」、1枠だけなら「12:20〜12:35」 */
function entryLabel(e: WeeklyEntry): string {
  if (!e.end_time) return timeRange(e.start_time, e.minutes);
  const start = e.start_time.slice(0, 5);
  const end = e.end_time.slice(0, 5);
  const n = slotCount(start, end, e.minutes);
  return n <= 1 ? `${start}〜${end}` : `${start}〜${end}（${e.minutes}分ずつ・${n}枠）`;
}
