"use client";

import { useState } from "react";
import { CHOICE, Field, INPUT } from "./ui";
import { PERIODS, slotCount } from "@/lib/periods";

/**
 * 時間帯（開始〜終了）と1回の長さ。時限のボタンで時間帯を入れられる。
 * 時間帯を1回の長さ（15分・30分）ごとに分けて、続けて予約できる枠にする。
 */
export function TimeRangeFields({
  idPrefix,
  defaultStart = "12:00",
  defaultEnd = "12:50",
  defaultMinutes = 15,
}: {
  idPrefix: string;
  defaultStart?: string;
  defaultEnd?: string;
  defaultMinutes?: number;
}) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const count = slotCount(start, end, minutes);

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">時限から選ぶ（時刻は下で変えられます）</legend>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <label key={p.label} className={`${CHOICE} min-h-11 px-3 py-1.5 text-xs font-bold`}>
              <input
                type="radio"
                name={`${idPrefix}period`}
                checked={start === p.start && end === p.end}
                onChange={() => {
                  setStart(p.start);
                  setEnd(p.end);
                }}
                className="sr-only"
              />
              {p.label}
              <span className="font-normal text-text-sub">
                {p.start}〜{p.end}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* スマホでは開始・終了を横に並べ、1回の長さは次の行に */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="開始" htmlFor={`${idPrefix}time`} required>
          <input id={`${idPrefix}time`} name="time" type="time" required step={300} value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="終了" htmlFor={`${idPrefix}end_time`} required>
          <input id={`${idPrefix}end_time`} name="end_time" type="time" required step={300} value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
        <div className="col-span-2 sm:col-span-1">
          <Field label="1回の長さ" htmlFor={`${idPrefix}minutes`}>
            <select id={`${idPrefix}minutes`} name="minutes" value={String(minutes)} onChange={(e) => setMinutes(Number(e.target.value))} className={INPUT}>
              <option value="15">15分</option>
              <option value="30">30分</option>
            </select>
          </Field>
        </div>
      </div>
      <p className={`text-sm ${count > 0 ? "text-text-sub" : "text-danger"}`}>
        {count > 0
          ? `→ ${start}から${minutes}分ずつ、${count}枠に分けて登録します（予約が入った枠だけが埋まります）`
          : `終了は、開始より${minutes}分以上あとにしてください`}
      </p>
    </div>
  );
}
