"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarOff, MapPin, Repeat, Video } from "lucide-react";
import { cancelDaySlots, cancelSlot } from "@/app/(app)/slots/actions";
import { SubmitButton } from "./form-bits";
import { Badge, EmptyState } from "./ui";
/** カレンダーは日曜はじまり */
const CALENDAR_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type CalendarSlot = {
  id: string;
  time: string;
  places: string;
  inPerson: boolean;
  booked: boolean;
  bookingId: string | null;
  weekly: boolean;
};

export type CalendarDay = {
  key: string;
  month: number;
  day: number;
  /** 今日から1ヶ月の範囲か（範囲外は薄く表示し、選べない） */
  inRange: boolean;
  isToday: boolean;
  slots: CalendarSlot[];
};

/**
 * これからの枠（1ヶ月先まで）を、日曜はじまりのカレンダーで見せる。
 * 日付を押すと、その日の枠が下に出る。
 */
export function SlotCalendar({ days, initialKey }: { days: CalendarDay[]; initialKey: string }) {
  const [selected, setSelected] = useState(initialKey);
  const day = days.find((d) => d.key === selected);
  const openCount = day ? day.slots.filter((s) => !s.booked).length : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-2 shadow-card sm:p-3">
        <div className="grid grid-cols-7 text-center text-xs font-bold text-text-sub">
          {CALENDAR_WEEKDAYS.map((w, i) => (
            <span key={w} className={`py-1 ${i === 0 || i === 6 ? "text-accent" : ""}`}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const open = d.slots.filter((s) => !s.booked).length;
            const booked = d.slots.length - open;
            const isSelected = d.key === selected;
            const label = `${d.month}月${d.day}日${d.inRange ? `、空き${open}枠${booked ? `、予約${booked}件` : ""}` : ""}`;
            return (
              <button
                key={d.key}
                type="button"
                disabled={!d.inRange}
                onClick={() => setSelected(d.key)}
                aria-pressed={isSelected}
                aria-label={label}
                className={`flex min-h-14 flex-col items-center justify-start gap-0.5 rounded-md px-0.5 py-1 text-sm transition-colors ${
                  !d.inRange
                    ? "cursor-default text-text-sub/40"
                    : isSelected
                      ? "bg-primary text-on-primary"
                      : d.slots.length
                        ? "bg-primary-soft hover:bg-primary-soft/70"
                        : "hover:bg-bg-section"
                }`}
              >
                <span className={`leading-5 ${d.isToday && !isSelected ? "rounded-full bg-accent px-1.5 font-bold text-on-primary" : "font-bold"}`}>
                  {d.day === 1 || d === days[0] ? `${d.month}/${d.day}` : d.day}
                </span>
                {d.inRange && open > 0 && <span className="text-[11px] leading-4">{open}枠</span>}
                {d.inRange && booked > 0 && (
                  <span className={`rounded-full px-1 text-[10px] font-bold leading-4 ${isSelected ? "bg-on-primary text-primary" : "bg-success text-on-primary"}`}>
                    予約{booked}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {day && (
        <section aria-live="polite" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 font-bold">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              {day.month}月{day.day}日の枠
            </h4>
            {openCount > 0 && (
              <form action={cancelDaySlots}>
                <input type="hidden" name="date" value={day.key} />
                <SubmitButton variant="ghost" pendingText="取り消し中…" className="text-xs">
                  <CalendarOff className="size-3.5" aria-hidden />
                  この日の空き枠をすべて取り消す（休みにする）
                </SubmitButton>
              </form>
            )}
          </div>
          {day.slots.length === 0 ? (
            <EmptyState title="この日の枠はありません" icon={<CalendarClock className="size-7" />}>
              毎週の時間を登録するか、左の「1回だけの枠」から追加できます。
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {day.slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3 shadow-card">
                  <div className="min-w-0 text-sm">
                    <p className="flex items-center gap-1.5 font-bold">
                      {s.time}
                      {s.weekly && <Badge tone="muted" icon={<Repeat className="size-3" aria-hidden />}>毎週</Badge>}
                    </p>
                    <p className="flex items-center gap-1 truncate text-text-sub">
                      {s.inPerson ? <MapPin className="size-3.5 shrink-0" aria-hidden /> : <Video className="size-3.5 shrink-0" aria-hidden />}
                      {s.places}
                    </p>
                  </div>
                  {s.booked ? (
                    s.bookingId ? (
                      <Link href={`/bookings/${s.bookingId}`} className="flex min-h-11 shrink-0 items-center">
                        <Badge tone="success">予約あり →</Badge>
                      </Link>
                    ) : (
                      <Badge tone="success">予約あり</Badge>
                    )
                  ) : (
                    <form action={cancelSlot} className="shrink-0">
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="ghost" pendingText="…" className="text-xs">
                        取り消す
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
