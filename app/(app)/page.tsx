import Link from "next/link";
import { ArrowRight, CalendarClock, Plus, ShieldCheck, Shuffle } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { searchOffers, type OfferRow } from "@/lib/offers";
import { formatSlot, hasStarted } from "@/lib/format";
import { placeLabel } from "@/lib/safety";
import type { MeetingPlace } from "@/lib/types";
import { Avatar, ButtonLink, EmptyState, SectionHeading } from "@/components/ui";
import { CategoryIconGrid } from "@/components/category/category-icon-grid";
import { CategorySidebar } from "@/components/category/category-sidebar";
import { SkillCard } from "@/components/skill/skill-card";
import { SkillCarousel } from "@/components/skill/skill-carousel";
import { DecorationCircles } from "@/components/decor/decoration-circles";

export default async function HomePage() {
  const { supabase, profile } = await requireOnboarded();
  const { fields, fieldLabel } = await loadMasters(supabase);

  const [rows, { data: upcoming }, { data: wallet }, { data: pastBookings }, { data: myReviews }] = await Promise.all([
    searchOffers(supabase, profile, fieldLabel),
    supabase
      .from("bookings")
      .select("id, learner_id, offer:offers(title), slot:slots(start_at, end_at, place, place_note)")
      .eq("status", "booked")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("wallets").select("balance").single(),
    supabase.from("bookings").select("id, status, cancelled_at, slot:slots(start_at)").neq("status", "cancelled").order("created_at", { ascending: false }).limit(50),
    supabase.from("safety_reviews").select("booking_id").eq("reviewer_id", profile.id),
  ]);
  // まだ回答していない安全レビュー（開始時刻を過ぎた予約）
  const reviewed = new Set((myReviews ?? []).map((r) => r.booking_id as string));
  const pendingReview = ((pastBookings ?? []) as unknown as { id: string; slot: { start_at: string } | null }[]).find(
    (b) => b.slot && hasStarted(b.slot.start_at) && !reviewed.has(b.id),
  );

  const countByField = new Map<string, number>();
  for (const r of rows) countByField.set(r.offer.field_code, (countByField.get(r.offer.field_code) ?? 0) + 1);
  const categories = fields.map((f) => ({ code: f.code, label: f.label, count: countByField.get(f.code) ?? 0, href: `/search?field=${f.code}` }));

  const topics = rows.filter((r) => r.offer.kind === "topic");
  const sections: { key: string; title: string; sub: string; href: string; rows: OfferRow[] }[] = [
    { key: "cross", title: "あなたにとって異分野のテーマ", sub: "自分と違う学部・分野の人のカード", href: "/search?kind=topic", rows: topics.filter((r) => r.cross && !r.mine) },
    {
      key: "soon",
      title: "もうすぐ話せる",
      sub: "近い日時に空き枠があるカード",
      href: "/search?sort=soon&open=1",
      rows: rows.filter((r) => !r.mine && r.open.length > 0).sort((a, b) => a.open[0].start_at.localeCompare(b.open[0].start_at)),
    },
    { key: "guide", title: "他学部のしくみ", sub: "ゼミ・研究室の決まり方、卒論、学び方", href: "/search?kind=faculty_guide", rows: rows.filter((r) => r.offer.kind === "faculty_guide") },
    { key: "new", title: "新着", sub: "最近出されたカード", href: "/search?sort=new", rows: [...rows].sort((a, b) => b.offer.created_at.localeCompare(a.offer.created_at)) },
  ];

  type Upcoming = { id: string; learner_id: string; offer: { title: string } | null; slot: { start_at: string; end_at: string; place: MeetingPlace; place_note: string | null } | null };
  const next = ((upcoming ?? []) as unknown as Upcoming[])
    .filter((b) => b.slot)
    .sort((a, b) => a.slot!.start_at.localeCompare(b.slot!.start_at))[0];

  return (
    <div className="space-y-14">
      {/* あいさつ */}
      <section className="relative isolate overflow-hidden rounded-lg bg-gradient-hero p-5 sm:p-7">
        <DecorationCircles />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar seed={profile.id} size="lg" className="ring-4 ring-surface" />
            <div>
              <p className="text-sm text-text-sub">こんにちは</p>
              <h1 className="text-xl sm:text-2xl">{profile.display_name}さん</h1>
              <p className="mt-0.5 text-sm">
                チケット <span className="text-lg font-bold text-primary">{wallet?.balance ?? 0}</span> 枚
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/offers/new" variant="accent">
              <Plus className="size-4" aria-hidden />
              カードを出す
            </ButtonLink>
            <ButtonLink href="/slots" variant="outline">
              <CalendarClock className="size-4" aria-hidden />
              空き枠を登録
            </ButtonLink>
          </div>
        </div>
        {next && next.slot && (
          <Link href={`/bookings/${next.id}`} className="relative mt-5 flex items-center gap-3 rounded-md bg-surface/90 p-3 text-sm shadow-card hover:bg-surface">
            <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-primary">{next.learner_id === profile.id ? "次に学ぶ予定" : "次に教える予定"}</span>
              <span className="block truncate font-bold">{next.offer?.title}</span>
              <span className="block truncate text-xs text-text-sub">{formatSlot(next.slot.start_at, next.slot.end_at)} ・ {placeLabel(next.slot)}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-text-sub" aria-hidden />
          </Link>
        )}
      </section>

      {pendingReview && (
        <Link href={`/bookings/${pendingReview.id}`} className="-mt-8 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft p-4 text-sm hover:bg-primary-soft/70">
          <ShieldCheck className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="flex-1">
            <span className="block font-bold text-primary">安全レビューにご協力ください</span>
            <span className="block text-xs text-text-sub">終わったセッションについて、30秒で回答できます。相手には表示されません。</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
        </Link>
      )}

      {/* 分野からさがす */}
      <section aria-labelledby="category-heading">
        <SectionHeading title={<span id="category-heading">分野からさがす</span>} sub="自分と違う分野をのぞいてみましょう" />
        <div className="grid gap-6 lg:grid-cols-[--spacing(60)_1fr]">
          <div className="hidden lg:block">
            <CategorySidebar title="分野" items={categories} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 shadow-card sm:p-6">
            <CategoryIconGrid items={categories} />
          </div>
        </div>
      </section>

      {sections.map((s) => (
        <section key={s.key} aria-labelledby={`${s.key}-heading`}>
          <SectionHeading
            title={
              <span id={`${s.key}-heading`} className="flex items-center gap-2">
                {s.key === "cross" && <Shuffle className="size-5 text-point" aria-hidden />}
                {s.title}
              </span>
            }
            sub={s.sub}
            action={
              s.rows.length > 0 && (
                <Link href={s.href} className="flex min-h-11 items-center gap-1 text-sm font-bold text-primary">
                  すべて見る
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              )
            }
          />
          {s.rows.length === 0 ? (
            <EmptyState
              title={s.key === "guide" ? "まだ「学部のしくみ」カードがありません" : "まだカードがありません"}
              action={<ButtonLink href="/offers/new" variant="pill">最初のカードを出してみる</ButtonLink>}
            >
              あなたの専門や、学部の仕組みを話すカードを出してみませんか？
            </EmptyState>
          ) : (
            <SkillCarousel label={s.title}>
              {s.rows.slice(0, 12).map((r) => (
                <SkillCard key={r.offer.id} data={r.card} />
              ))}
            </SkillCarousel>
          )}
        </section>
      ))}
    </div>
  );
}
