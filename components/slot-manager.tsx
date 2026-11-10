import Link from "next/link";
import { CalendarClock, MapPin, Video } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelSlot } from "@/app/(app)/slots/actions";
import { SlotForm } from "./slot-form";
import { SubmitButton } from "./form-bits";
import { Badge, Card, EmptyState } from "./ui";
import { daysAgoIso, formatSlot, todayJst } from "@/lib/format";
import { placeLabel } from "@/lib/safety";
import type { Slot } from "@/lib/types";

/**
 * 空き枠の登録と、これからの枠の一覧。/slots とプロフィールの編集画面で使う。
 * stacked: 縦に並べる（幅の狭い画面用）。false なら PC では左右に並べる
 */
export async function SlotManager({ supabase, teacherId, stacked = false }: { supabase: SupabaseClient; teacherId: string; stacked?: boolean }) {
  const [{ data: slotRows }, { count: offerCount }, { data: bookings }] = await Promise.all([
    supabase
      .from("slots")
      .select("*")
      .eq("teacher_id", teacherId)
      .neq("status", "cancelled")
      .gt("end_at", daysAgoIso(0))
      .order("start_at"),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("is_active", true),
    supabase.from("bookings").select("id, slot_id").eq("teacher_id", teacherId).eq("status", "booked"),
  ]);
  const slots = (slotRows ?? []) as Slot[];
  const bookingBySlot = new Map((bookings ?? []).map((b) => [b.slot_id as string, b.id as string]));

  return (
    <div className="space-y-6">
      {(offerCount ?? 0) === 0 && (
        <p className="rounded-md bg-warn-soft px-4 py-3 text-sm text-warn">
          公開中のカードがありません。枠は<Link href="/offers/new" className="font-bold underline">カード</Link>と組み合わせて予約されます。
        </p>
      )}

      <div className={stacked ? "space-y-8" : "grid gap-8 lg:grid-cols-[--spacing(100)_1fr] lg:items-start"}>
        <Card>
          <h3 className="mb-4 text-lg">枠を追加する</h3>
          <SlotForm today={todayJst()} />
        </Card>

        <section aria-labelledby="slots-heading">
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
                      <p className="font-bold">{formatSlot(s.start_at, s.end_at)}</p>
                      <p className="flex items-center gap-1 truncate text-text-sub">
                        {s.mode === "online" ? <Video className="size-3.5 shrink-0" aria-hidden /> : <MapPin className="size-3.5 shrink-0" aria-hidden />}
                        {placeLabel(s)}
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
