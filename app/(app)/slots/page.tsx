import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { cancelSlot } from "./actions";
import { SlotForm } from "@/components/slot-form";
import { SubmitButton } from "@/components/form-bits";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { formatSlot, todayJst } from "@/lib/format";
import type { Slot } from "@/lib/types";

export default async function SlotsPage() {
  const { supabase, profile } = await requireOnboarded();

  const [{ data: slotRows }, { count: offerCount }, { data: bookings }] = await Promise.all([
    supabase
      .from("slots")
      .select("*")
      .eq("teacher_id", profile.id)
      .neq("status", "cancelled")
      .gt("end_at", new Date().toISOString())
      .order("start_at"),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("teacher_id", profile.id).eq("is_active", true),
    supabase.from("bookings").select("id, slot_id").eq("teacher_id", profile.id).eq("status", "booked"),
  ]);
  const slots = (slotRows ?? []) as Slot[];
  const bookingBySlot = new Map((bookings ?? []).map((b) => [b.slot_id as string, b.id as string]));

  return (
    <div className="space-y-6">
      <PageTitle sub="話せる時間をあらかじめ出しておくと、相手はワンクリックで予約できます。">オフィスアワー（空き枠）</PageTitle>

      {(offerCount ?? 0) === 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          公開中のカードがありません。枠は<Link href="/offers/new" className="font-semibold underline">カード</Link>と組み合わせて予約されます。
        </p>
      )}

      <Card>
        <SlotForm today={todayJst()} />
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-700">これからの枠</h2>
        {slots.length === 0 ? (
          <Empty>まだ枠がありません。</Empty>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
                <div className="text-sm">
                  <p className="font-semibold">{formatSlot(s.start_at, s.end_at)}</p>
                  <p className="text-stone-600">{s.mode === "online" ? "オンライン" : "対面"}：{s.location}</p>
                </div>
                {s.status === "booked" ? (
                  bookingBySlot.get(s.id) ? (
                    <Link href={`/bookings/${bookingBySlot.get(s.id)}`}><Badge tone="ok">予約あり →</Badge></Link>
                  ) : (
                    <Badge tone="ok">予約あり</Badge>
                  )
                ) : (
                  <form action={cancelSlot}>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton variant="ghost" pendingText="…" className="px-2 py-1 text-xs">取り消す</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
