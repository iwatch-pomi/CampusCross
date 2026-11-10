"use client";

import { ShieldCheck } from "lucide-react";
import { CHOICE, Field, INPUT } from "./ui";
import { PLACE_ORDER, PLACES } from "@/lib/safety";
import type { MeetingPlace } from "@/lib/types";

/**
 * 場所の候補（いくつでも）と、Zoom の URL・待ち合わせの目印の入力欄。
 * 選んでいる場所は親が持つ（送信後に form を作り直しても、選択を残せるように）
 */
export function PlaceFields({
  places,
  onChange,
  idPrefix = "",
}: {
  places: MeetingPlace[];
  onChange: (next: MeetingPlace[]) => void;
  idPrefix?: string;
}) {
  const toggle = (p: MeetingPlace) =>
    onChange(places.includes(p) ? places.filter((x) => x !== p) : PLACE_ORDER.filter((x) => x === p || places.includes(x)));
  const hasZoom = places.includes("zoom");
  const hasInPerson = places.some((p) => p !== "zoom");

  return (
    <>
      <fieldset>
        <legend className="mb-1 text-sm font-bold">場所（学内の公共スペースか Zoom。いくつでも選べます）</legend>
        <p className="mb-2 text-xs text-text-sub">複数選ぶと、予約する人がその中から選びます。</p>
        <div className="grid grid-cols-2 gap-2">
          {PLACE_ORDER.map((p) => {
            const { label, hint, icon: Icon } = PLACES[p];
            return (
              <label key={p} className={`${CHOICE} gap-1`}>
                <input type="checkbox" name="place" value={p} checked={places.includes(p)} onChange={() => toggle(p)} className="sr-only" />
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

      {places.length === 0 && <p className="text-sm text-danger">場所を1つ以上選んでください</p>}

      {hasZoom && (
        <Field label="ZoomのURL" htmlFor={`${idPrefix}meeting_url`} required hint="Zoom を選んで予約した人にだけ表示されます。一覧には出ません">
          <input id={`${idPrefix}meeting_url`} name="meeting_url" type="url" required inputMode="url" placeholder="https://zoom.us/j/..." className={INPUT} />
        </Field>
      )}
      {hasInPerson && (
        <Field label="待ち合わせの目印（任意）" htmlFor={`${idPrefix}place_note`} hint="例：中央図書館1F 入口付近、窓側のテーブル（40文字まで）">
          <input id={`${idPrefix}place_note`} name="place_note" maxLength={40} placeholder="入口すぐのテーブル" className={INPUT} />
        </Field>
      )}
    </>
  );
}
