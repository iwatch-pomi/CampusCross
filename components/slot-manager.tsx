import Link from "next/link";
import { CalendarClock, MapPin, Repeat, Trash2, Video } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelSlot, deleteWeeklyHour } from "@/app/(app)/slots/actions";
import { WeeklyHoursForm } from "./weekly-hours-form";
import { SlotForm } from "./slot-form";
import { SubmitButton } from "./form-bits";
import { Badge, Card, EmptyState } from "./ui";
import { daysAgoIso, formatSlot, todayJst, WEEKDAYS } from "@/lib/format";
import { placesLabel, slotModes } from "@/lib/safety";
import type { MeetingPlace, Slot } from "@/lib/types";

type WeeklyHour = { id: string; weekday: number; start_time: string; minutes: number; places: MeetingPlace[]; place_note: string | null };

/** "12:20:00" と 15 → "12:20〜12:35" */
function timeRange(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const end = h * 60 + m + minutes;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}〜${pad(Math.floor(end / 60) % 24)}:${pad(end % 60)}`;
}

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
      .order("start_at"),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("is_active", true),
    supabase.from("bookings").select("id, slot_id").eq("teacher_id", teacherId).eq("status", "booked"),
    supabase.from("weekly_hours").select("id, weekday, start_time, minutes, places, place_note").eq("teacher_id", teacherId).order("weekday").order("start_time"),
  ]);
  const weekly = (weeklyRows ?? []) as WeeklyHour[];
  const slots = (slotRows ?? []) as Slot[];
  const bookingBySlot = new Map((bookings ?? []).map((b) => [b.slot_id as string, b.id as string]));

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
          登録すると、4週間先までの空き枠が自動でできます（毎日、先の週が足されます）。休む週は、下の「これからの枠」でその日だけ取り消してください。
        </p>
        <div className={stacked ? "space-y-6" : "grid gap-6 lg:grid-cols-2 lg:items-start"}>
          <Card className="min-w-0 py-2">
            <ul className="divide-y divide-border">
              {WEEKDAYS.map((label, i) => {
                const items = weekly.filter((w) => w.weekday === i + 1);
                return (
                  <li key={label} className="flex gap-3 py-2.5">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${items.length ? "bg-primary text-on-primary" : "bg-bg-section text-text-sub"}`}>
                      {label}
                    </span>
                    {items.length === 0 ? (
                      <span className="self-center text-sm text-text-sub">—</span>
                    ) : (
                      <ul className="min-w-0 flex-1 space-y-1">
                        {items.map((w) => (
                          <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0">
                              <span className="font-bold">{timeRange(w.start_time, w.minutes)}</span>
                              <span className="block truncate text-xs text-text-sub">{placesLabel(w)}</span>
                            </span>
                            <form action={deleteWeeklyHour}>
                              <input type="hidden" name="id" value={w.id} />
                              <SubmitButton variant="ghost" pendingText="…" className="text-xs">
                                <Trash2 className="size-3.5" aria-hidden />
                                <span className="sr-only">{label}曜 {timeRange(w.start_time, w.minutes)} を</span>削除
                              </SubmitButton>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="min-w-0">
            <h4 className="mb-4 font-bold">毎週の時間を追加する</h4>
            <WeeklyHoursForm />
          </Card>
        </div>
      </section>

      <div className={stacked ? "space-y-8" : "grid gap-8 lg:grid-cols-[--spacing(100)_1fr] lg:items-start"}>
        <Card className="min-w-0">
          <h3 className="mb-1 text-lg">1回だけの枠を追加する</h3>
          <p className="mb-4 text-xs text-text-sub">毎週ではない日に話せるときに使います。</p>
          <SlotForm today={todayJst()} />
        </Card>

        <section aria-labelledby="slots-heading" className="min-w-0">
          <h3 id="slots-heading" className="mb-3 text-lg">これからの枠</h3>
          {slots.length === 0 ? (
            <EmptyState title="まだ枠がありません" icon={<CalendarClock className="size-7" />}>
              昼休みや空きコマなど、15分だけ話せる時間を出してみましょう。
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {slots.map((s) => {
                const bookingId = bookingBySlot.get(s.id);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3 shadow-card">
                    <div className="min-w-0 text-sm">
                      <p className="flex items-center gap-1.5 font-bold">
                        {formatSlot(s.start_at, s.end_at)}
                        {s.weekly_hour_id && <Badge tone="muted" icon={<Repeat className="size-3" aria-hidden />}>毎週</Badge>}
                      </p>
                      <p className="flex items-center gap-1 truncate text-text-sub">
                        {slotModes(s.places).inPerson ? <MapPin className="size-3.5 shrink-0" aria-hidden /> : <Video className="size-3.5 shrink-0" aria-hidden />}
                        {placesLabel(s)}
                      </p>
                    </div>
                    {s.status === "booked" ? (
                      bookingId ? (
                        <Link href={`/bookings/${bookingId}`} className="flex min-h-11 items-center">
                          <Badge tone="success">予約あり →</Badge>
                        </Link>
                      ) : (
                        <Badge tone="success">予約あり</Badge>
                      )
                    ) : (
                      <form action={cancelSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton variant="ghost" pendingText="…" className="text-xs">取り消す</SubmitButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
