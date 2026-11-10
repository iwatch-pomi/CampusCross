import Link from "next/link";
import { CalendarClock, CopyPlus, MapPin, Repeat, Video } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelSlot } from "@/app/(app)/slots/actions";
import { WeeklySchedule, type WeeklyEntry } from "./weekly-schedule";
import { WeeklyHoursForm } from "./weekly-hours-form";
import { SlotForm } from "./slot-form";
import { SubmitButton } from "./form-bits";
import { Badge, Card, EmptyState } from "./ui";
import { daysAgoIso, formatSlot, todayJst } from "@/lib/format";
import { placesLabel, slotModes } from "@/lib/safety";
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
      .order("start_at"),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("is_active", true),
    supabase.from("bookings").select("id, slot_id").eq("teacher_id", teacherId).eq("status", "booked"),
    supabase
      .from("weekly_hours")
      .select("id, weekday, start_time, minutes, places, place_note, secret:weekly_hour_secrets(meeting_url)")
      .eq("teacher_id", teacherId)
      .order("weekday")
      .order("start_time"),
  ]);
  const weekly: WeeklyEntry[] = ((weeklyRows ?? []) as unknown as (Omit<WeeklyEntry, "meeting_url"> & { secret: { meeting_url: string } | { meeting_url: string }[] | null })[]).map(
    ({ secret, ...w }) => ({ ...w, meeting_url: (Array.isArray(secret) ? secret[0]?.meeting_url : secret?.meeting_url) ?? null }),
  );
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
          曜日ごとに、話せる時間を登録できます（授業のない時間など。1日にいくつでも）。登録すると4週間先までの空き枠が自動でできて、毎日先の週が足されます。休む日は、下の「これからの枠」でその日だけ取り消してください。
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
