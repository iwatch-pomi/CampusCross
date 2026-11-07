import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { Badge, ButtonLink, Card, Empty, BUTTON } from "@/components/ui";
import { GRADE_LABEL, KIND_LABEL, LEDGER_LABEL } from "@/lib/constants";
import { formatDateTime, formatSlot, hasStarted } from "@/lib/format";
import type { Booking, LedgerEntry, Offer, Slot } from "@/lib/types";

type BookingRow = Booking & {
  slot: Pick<Slot, "start_at" | "end_at" | "location">;
  offer: Pick<Offer, "id" | "title" | "kind">;
  learner: { display_name: string };
  teacher: { display_name: string };
};

export default async function MePage() {
  const { supabase, profile } = await requireOnboarded();

  const [{ facultyName, fieldLabel }, { data: wallet }, { data: ledger }, { data: bookingRows }, { data: offerRows }] =
    await Promise.all([
      loadMasters(supabase),
      supabase.from("wallets").select("balance").single(),
      supabase.from("token_ledger").select("*").order("created_at", { ascending: false }).limit(20),
      supabase
        .from("bookings")
        .select(
          "*, slot:slots(start_at, end_at, location), offer:offers(id, title, kind), learner:profiles!bookings_learner_id_fkey(display_name), teacher:profiles!bookings_teacher_id_fkey(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("offers").select("*").eq("teacher_id", profile.id).order("created_at", { ascending: false }),
    ]);

  const bookings = (bookingRows ?? []) as BookingRow[];
  const offers = (offerRows ?? []) as Offer[];

  const upcoming = bookings
    .filter((b) => b.status === "booked")
    .sort((a, b) => new Date(a.slot.start_at).getTime() - new Date(b.slot.start_at).getTime());
  const taught = bookings.filter((b) => b.teacher_id === profile.id && b.status === "completed");
  const learned = bookings.filter((b) => b.learner_id === profile.id && b.status === "completed");
  const taughtCross = taught.filter((b) => b.is_cross_field).length;
  const thanks = taught.filter((b) => b.thanks_message);
  const themes = [...new Set(taught.map((b) => b.offer.title))];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{profile.display_name}</p>
            <p className="text-sm text-stone-600">
              {profile.faculty_id && facultyName[profile.faculty_id]}
              {profile.department && ` ${profile.department}`}
              {profile.grade && ` ・ ${GRADE_LABEL[profile.grade] ?? ""}`}
              {profile.field_code && ` ・ ${fieldLabel[profile.field_code]}`}
            </p>
          </div>
          <ButtonLink href="/me/profile" variant="secondary" className="shrink-0 px-3 py-1.5 text-xs">編集</ButtonLink>
        </div>
        {profile.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{profile.bio}</p>}
      </Card>

      <section id="teaching">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">教えた実績</h2>
        <Card className="space-y-4">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label="教えた回数" value={taught.length} />
            <Stat label="うち異分野" value={taughtCross} />
            <Stat label="教わった回数" value={learned.length} />
          </dl>
          {themes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-500">話したテーマ</p>
              <ul className="mt-1 list-inside list-disc text-sm text-stone-800">
                {themes.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
          {thanks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-stone-500">受け取ったお礼コメント</p>
              <ul className="mt-2 space-y-2">
                {thanks.map((b) => (
                  <li key={b.id} className="rounded-xl border-l-4 border-teal-400 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                    {b.thanks_message}
                    <span className="mt-1 block text-xs text-teal-700">— {b.learner.display_name}さん（{b.offer.title}）</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-stone-500">教えると、ここにお礼コメントが集まります。ガクチカの実績にも使えます。</p>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-700">これからの予約</h2>
        {upcoming.length === 0 ? (
          <Empty>予約はありません。</Empty>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b) => {
              const iTeach = b.teacher_id === profile.id;
              const waiting = hasStarted(b.slot.start_at);
              return (
                <li key={b.id}>
                  <Link href={`/bookings/${b.id}`} className="block rounded-xl border border-stone-200 bg-white p-3 hover:border-indigo-300">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Badge tone={iTeach ? "guide" : "neutral"}>{iTeach ? "教える" : "学ぶ"}</Badge>
                      {waiting && <Badge tone="warn">{iTeach ? "相手の完了待ち" : "完了を押してください"}</Badge>}
                    </div>
                    <p className="text-sm font-semibold">{b.offer.title}</p>
                    <p className="text-xs text-stone-600">
                      {formatSlot(b.slot.start_at, b.slot.end_at)} ・ {b.slot.location} ・ {iTeach ? b.learner.display_name : b.teacher.display_name}さん
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">自分のカード</h2>
          <Link href="/offers/new" className="text-sm font-semibold text-indigo-700">＋ つくる</Link>
        </div>
        {offers.length === 0 ? (
          <Empty>まだカードがありません。</Empty>
        ) : (
          <ul className="space-y-2">
            {offers.map((o) => (
              <li key={o.id}>
                <Link href={`/offers/${o.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3 hover:border-indigo-300">
                  <span className="text-sm font-semibold">{o.title}</span>
                  <span className="flex shrink-0 gap-1">
                    <Badge tone={o.kind === "faculty_guide" ? "guide" : "neutral"}>{KIND_LABEL[o.kind]}</Badge>
                    {!o.is_active && <Badge tone="warn">非公開</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="tickets">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">チケット</h2>
        <Card>
          <p className="text-2xl font-bold text-indigo-700">{wallet?.balance ?? 0}<span className="ml-1 text-sm font-medium">枚</span></p>
          <p className="mt-1 text-xs text-stone-500">
            教えると+1枚、教わると−1枚。毎月1枚が配られます（残高5枚未満のとき）。換金・譲渡はできません。
          </p>
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {((ledger ?? []) as LedgerEntry[]).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <span>
                  {e.booking_id ? <Link href={`/bookings/${e.booking_id}`} className="hover:underline">{LEDGER_LABEL[e.reason]}</Link> : LEDGER_LABEL[e.reason]}
                  <span className="ml-2 text-xs text-stone-400">{formatDateTime(e.created_at)}</span>
                </span>
                <span className={e.amount > 0 ? "font-semibold text-emerald-700" : "font-semibold text-stone-500"}>
                  {e.amount > 0 ? `+${e.amount}` : e.amount}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <form action="/auth/signout" method="post">
        <button type="submit" className={`${BUTTON.ghost} w-full`}>ログアウト</button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-50 py-2">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-xl font-bold text-stone-900">{value}</dd>
    </div>
  );
}
