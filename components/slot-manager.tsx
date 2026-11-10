import Link from "next/link";
import { CopyPlus, Repeat } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WeeklySchedule, type WeeklyEntry } from "./weekly-schedule";
import { WeeklyHoursForm } from "./weekly-hours-form";
import { SlotForm } from "./slot-form";
import { Card } from "./ui";
import { addDaysKey, daysAgoIso, formatTimeRange, hoursFromNowIso, jstDateKey, sundayIndex, todayJst } from "@/lib/format";
import { placesLabel, slotModes } from "@/lib/safety";
import { SlotCalendar, type CalendarDay, type CalendarSlot } from "./slot-calendar";
import type { Slot } from "@/lib/types";

/**
 * 空き枠の登録と、これからの枠の一覧。/slots とプロフィールの編集画面で使う。
 * stacked: 縦に並べる（幅の狭い画面用）。false なら PC では左右に並べる
 */
export async function SlotManager({ supabase, teacherId, stacked = false }: { supabase: SupabaseClient; teacherId: string; stacked?: boolean }) {
  const [{ data: slotRows }, { count: offerCount }, { data: bookings }, { data: weeklyRows }] = await Promise.all([
    supabase
      .from("slots")
      .select("*")
      .eq("teacher_id", teacherId)
      .neq("status", "cancelled")
      .gt("end_at", daysAgoIso(0))
      .lt("start_at", hoursFromNowIso(24 * 31))
      .order("start_at"),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("is_active", true),
    supabase.from("bookings").select("id, slot_id").eq("teacher_id", teacherId).eq("status", "booked"),
    supabase
      .from("weekly_hours")
      .select("id, weekday, start_time, end_time, minutes, places, place_note, secret:weekly_hour_secrets(meeting_url)")
      .eq("teacher_id", teacherId)
      .order("weekday")
      .order("start_time"),
  ]);
  const weekly: WeeklyEntry[] = ((weeklyRows ?? []) as unknown as (Omit<WeeklyEntry, "meeting_url"> & { secret: { meeting_url: string } | { meeting_url: string }[] | null })[]).map(
    ({ secret, ...w }) => ({ ...w, meeting_url: (Array.isArray(secret) ? secret[0]?.meeting_url : secret?.meeting_url) ?? null }),
  );
  const slots = (slotRows ?? []) as Slot[];
  const bookingBySlot = new Map((bookings ?? []).map((b) => [b.slot_id as string, b.id as string]));

  // カレンダー：今週の日曜から、1ヶ月後の週の土曜まで（範囲は今日〜30日後）
  const today = todayJst();
  const last = addDaysKey(today, 30);
  const first = addDaysKey(today, -sundayIndex(today));
  const end = addDaysKey(last, 6 - sundayIndex(last));
  const byDay = new Map<string, CalendarSlot[]>();
  for (const sl of slots) {
    const key = jstDateKey(sl.start_at);
    const { inPerson } = slotModes(sl.places);
    byDay.set(key, [
      ...(byDay.get(key) ?? []),
      {
        id: sl.id,
        time: formatTimeRange(sl.start_at, sl.end_at),
        places: placesLabel(sl),
        inPerson,
        booked: sl.status === "booked",
        bookingId: bookingBySlot.get(sl.id) ?? null,
        weekly: !!sl.weekly_hour_id,
      },
    ]);
  }
  const days: CalendarDay[] = [];
  for (let key = first; key <= end; key = addDaysKey(key, 1)) {
    const [, m, d] = key.split("-").map(Number);
    days.push({ key, month: m, day: d, inRange: key >= today && key <= last, isToday: key === today, slots: byDay.get(key) ?? [] });
  }
  // 最初に開く日：今日以降で、枠がある最初の日（なければ今日）
  const initialKey = days.find((d) => d.inRange && d.slots.length > 0)?.key ?? today;

  return (
    <div className="space-y-6">
      {(offerCount ?? 0) === 0 && (
        <p className="rounded-md bg-warn-soft px-4 py-3 text-sm text-warn">
          公開中のカードがありません。枠は<Link href="/offers/new" className="font-bold underline">カード</Link>と組み合わせて予約されます。
        </p>
      )}

      <section aria-labelledby="weekly-heading" className="space-y-3">
        <h3 id="weekly-heading" className="flex items-center gap-2 text-lg">
          <Repeat className="size-5 text-primary" aria-hidden />
          毎週のオフィスアワー（月〜日）
        </h3>
        <p className="text-sm text-text-sub">
          曜日ごとに、話せる時間を登録できます（授業のない時間など。1日にいくつでも）。登録すると4週間先までの空き枠が自動でできて、毎日先の週が足されます。休む日は、下の「これからの枠」のカレンダーで、その日の枠を取り消してください。
        </p>
        <Card className="min-w-0 py-2">
          <WeeklySchedule entries={weekly} />
        </Card>
        <details className="rounded-lg border border-border bg-surface p-4 shadow-card open:p-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-primary">
            <CopyPlus className="size-4" aria-hidden />
            同じ時間を、いくつかの曜日にまとめて追加する
          </summary>
          <div className="mt-4">
            <WeeklyHoursForm />
          </div>
        </details>
      </section>

      <div className={stacked ? "space-y-8" : "grid gap-8 lg:grid-cols-[--spacing(100)_1fr] lg:items-start"}>
        <Card className="min-w-0">
          <h3 className="mb-1 text-lg">1回だけの枠を追加する</h3>
          <p className="mb-4 text-xs text-text-sub">毎週ではない日に話せるときに使います。</p>
          <SlotForm today={todayJst()} />
        </Card>

        <section aria-labelledby="slots-heading" className="min-w-0">
          <h3 id="slots-heading" className="mb-1 text-lg">これからの枠（1ヶ月先まで）</h3>
          <p className="mb-3 text-sm text-text-sub">日付を押すと、その日の枠が出ます。休む日は、その日の枠を取り消してください。</p>
          <SlotCalendar days={days} initialKey={initialKey} />
        </section>
      </div>
    </div>
  );
}
