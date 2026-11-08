import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, LogOut, Pencil, Plus, ShieldAlert, ShieldCheck, Ticket } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { Avatar, Badge, ButtonLink, Card, EmptyState, SectionHeading, buttonClass } from "@/components/ui";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { CategoryIcon } from "@/components/category/category-icon";
import { GRADE_LABEL, KIND_LABEL, LEDGER_LABEL } from "@/lib/constants";
import { ENCOURAGE } from "@/lib/content";
import { formatDateTime, formatSlot, hasStarted } from "@/lib/format";
import { placeLabel } from "@/lib/safety";
import type { Booking, LedgerEntry, Offer, Slot } from "@/lib/types";

export const metadata: Metadata = { title: "マイページ" };

type BookingRow = Booking & {
  slot: Pick<Slot, "start_at" | "end_at" | "place" | "place_note">;
  offer: Pick<Offer, "id" | "title" | "kind">;
  learner: { id: string; display_name: string; grade: string | null; faculty: { name: string } | null };
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
          "*, slot:slots(start_at, end_at, place, place_note), offer:offers(id, title, kind), learner:profiles!bookings_learner_id_fkey(id, display_name, grade, faculty:faculties(name)), teacher:profiles!bookings_teacher_id_fkey(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("offers").select("*").eq("teacher_id", profile.id).order("created_at", { ascending: false }),
    ]);

  const bookings = (bookingRows ?? []) as BookingRow[];
  const offers = (offerRows ?? []) as Offer[];

  const upcoming = bookings
    .filter((b) => b.status === "booked")
    .sort((a, b) => a.slot.start_at.localeCompare(b.slot.start_at));
  const taught = bookings.filter((b) => b.teacher_id === profile.id && b.status === "completed");
  const learned = bookings.filter((b) => b.learner_id === profile.id && b.status === "completed");
  const thanks = taught.filter((b) => b.thanks_message);
  const themes = [...new Set(taught.map((b) => b.offer.title))];

  return (
    <div className="space-y-12">
      {/* プロフィール */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-hero p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar seed={profile.id} name={profile.display_name} size="xl" className="ring-4 ring-surface" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl">{profile.display_name}</h1>
            <p className="text-sm text-text-sub">
              {[profile.faculty_id && facultyName[profile.faculty_id], profile.grade && GRADE_LABEL[profile.grade]].filter(Boolean).join(" ・ ")}
            </p>
            {profile.field_code && (
              <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                <CategoryIcon field={profile.field_code} size="sm" />
                {fieldLabel[profile.field_code]}
              </div>
            )}
          </div>
          <ButtonLink href="/me/profile" variant="outline" className="self-start sm:self-center">
            <Pencil className="size-4" aria-hidden />
            編集
          </ButtonLink>
        </div>
        {profile.bio && <p className="mt-4 whitespace-pre-wrap rounded-md bg-surface/80 p-3 text-sm">{profile.bio}</p>}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-text-sub">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          {profile.same_gender_only ? "同性からの申し込みのみ受け付けています" : "安心設定：同性限定はオフ"}（編集から変更できます）
        </p>
      </section>

      {profile.is_admin && (
        <ButtonLink href="/admin" variant="outline" className="w-full">
          <ShieldAlert className="size-4" aria-hidden />
          運営ページ（通報の確認・利用停止）
        </ButtonLink>
      )}

      {/* 教えた実績 */}
      <section id="teaching" aria-labelledby="teaching-heading" className="scroll-mt-20">
        <SectionHeading title={<span id="teaching-heading">教えた実績</span>} sub={ENCOURAGE.teachingRecord} />
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["教えた回数", taught.length],
            ["うち異分野", taught.filter((b) => b.is_cross_field).length],
            ["教わった回数", learned.length],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse items-center rounded-lg bg-surface py-4 shadow-card">
              <dt className="text-xs text-text-sub">{label}</dt>
              <dd className="text-4xl font-bold text-accent">{value}</dd>
            </div>
          ))}
        </dl>
        {themes.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm text-text-sub">話したテーマ</h3>
            <ul className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <li key={t} className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">{t}</li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="mb-3 mt-6 text-sm text-text-sub">受け取ったお礼コメント</h3>
        {thanks.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {thanks.map((b) => (
              <li key={b.id}>
                <TestimonialCard
                  quote={b.thanks_message!}
                  name={`${b.learner.display_name}さん`}
                  attribute={[b.learner.faculty?.name, b.learner.grade && GRADE_LABEL[b.learner.grade]].filter(Boolean).join(" ")}
                  footnote={`「${b.offer.title}」`}
                  seed={b.learner.id}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="まだお礼コメントはありません">教えると、ここにお礼コメントが集まります。</EmptyState>
        )}
      </section>

      {/* これからの予約 */}
      <section aria-labelledby="upcoming-heading">
        <SectionHeading title={<span id="upcoming-heading">これからの予約</span>} />
        {upcoming.length === 0 ? (
          <EmptyState
            title="予約はありません"
            icon={<CalendarClock className="size-7" />}
            action={<ButtonLink href="/search" variant="pill">カードをさがす</ButtonLink>}
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => {
              const iTeach = b.teacher_id === profile.id;
              const waiting = hasStarted(b.slot.start_at);
              return (
                <li key={b.id}>
                  <Link href={`/bookings/${b.id}`} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        <Badge tone={iTeach ? "accent" : "primary"}>{iTeach ? "教える" : "学ぶ"}</Badge>
                        {waiting && <Badge tone="warn">{iTeach ? "相手の完了待ち" : "完了を押してください"}</Badge>}
                      </div>
                      <p className="truncate font-bold">{b.offer.title}</p>
                      <p className="truncate text-xs text-text-sub">
                        {formatSlot(b.slot.start_at, b.slot.end_at)} ・ {placeLabel(b.slot)} ・ {iTeach ? b.learner.display_name : b.teacher.display_name}さん
                      </p>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-text-sub" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 自分のカード */}
      <section aria-labelledby="mycards-heading">
        <SectionHeading
          title={<span id="mycards-heading">自分のカード</span>}
          action={
            <ButtonLink href="/offers/new" variant="pill">
              <Plus className="size-4" aria-hidden />
              つくる
            </ButtonLink>
          }
        />
        {offers.length === 0 ? (
          <EmptyState title="まだカードがありません">あなたの専門や、学部の仕組みを話すカードを出してみましょう。</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {offers.map((o) => (
              <li key={o.id}>
                <Link href={`/offers/${o.id}`} className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-card hover:shadow-card-hover">
                  <CategoryIcon field={o.field_code} shape="square" size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{o.title}</span>
                  <span className="flex shrink-0 gap-1">
                    <Badge tone={o.kind === "faculty_guide" ? "accent" : "neutral"}>{KIND_LABEL[o.kind]}</Badge>
                    {!o.is_active && <Badge tone="danger">非公開</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* チケット */}
      <section id="tickets" aria-labelledby="tickets-heading" className="scroll-mt-20">
        <SectionHeading title={<span id="tickets-heading">チケット</span>} />
        <Card>
          <p className="flex items-baseline gap-1 text-primary">
            <Ticket className="size-6 self-center" aria-hidden />
            <span className="text-5xl font-bold leading-none">{wallet?.balance ?? 0}</span>
            <span className="font-bold">枚</span>
          </p>
          <p className="mt-2 text-xs text-text-sub">
            教えると+1枚、教わると−1枚。毎月1枚が配られます（残高5枚未満のとき）。換金・譲渡はできません。
          </p>
          <ul className="mt-4 divide-y divide-border text-sm">
            {((ledger ?? []) as LedgerEntry[]).map((e) => (
              <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span>
                  {e.booking_id ? (
                    <Link href={`/bookings/${e.booking_id}`} className="hover:text-primary hover:underline">{LEDGER_LABEL[e.reason]}</Link>
                  ) : (
                    LEDGER_LABEL[e.reason]
                  )}
                  <span className="block text-xs text-text-sub">{formatDateTime(e.created_at)}</span>
                </span>
                <span className={`font-bold ${e.amount > 0 ? "text-success" : "text-text-sub"}`}>
                  {e.amount > 0 ? `+${e.amount}` : e.amount}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <form action="/auth/signout" method="post">
        <button type="submit" className={buttonClass("ghost", "md", "w-full")}>
          <LogOut className="size-4" aria-hidden />
          ログアウト
        </button>
      </form>
    </div>
  );
}
