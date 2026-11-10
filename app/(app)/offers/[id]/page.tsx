import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, Pencil, ShieldCheck, Shuffle, Ticket } from "lucide-react";
import { isCrossField, requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { bookableTeacherIds, loadOpenSlots, TEACHER_SELECT, toCard, type OfferWithTeacher } from "@/lib/offers";
import { categoryMeta } from "@/lib/categories";
import { GRADE_LABEL } from "@/lib/constants";
import { formatSlot, minutesBetween } from "@/lib/format";
import { placeLabel } from "@/lib/safety";
import { BookingForm } from "@/components/booking-form";
import { Avatar, Badge, ButtonLink, Card, EmptyState, OfficialBadge, buttonClass } from "@/components/ui";
import { SkillThumbnail } from "@/components/skill/skill-thumbnail";
import { SkillCard } from "@/components/skill/skill-card";
import { SkillCarousel } from "@/components/skill/skill-carousel";

export default async function OfferPage({ params, searchParams }: PageProps<"/offers/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await requireOnboarded();

  const [{ data }, { fieldLabel }, { data: wallet }] = await Promise.all([
    supabase.from("offers").select(`*, ${TEACHER_SELECT}`).eq("id", id).maybeSingle(),
    loadMasters(supabase),
    supabase.from("wallets").select("balance").single(),
  ]);
  if (!data) notFound();
  const offer = data as OfferWithTeacher;
  const t = offer.teacher;
  const isMine = offer.teacher_id === profile.id;
  const cross = !isMine && isCrossField(profile, t);
  const balance = wallet?.balance ?? 0;

  const [openSlots, { data: others }, allowed] = await Promise.all([
    loadOpenSlots(supabase, [offer.teacher_id]),
    supabase.from("offers").select(`*, ${TEACHER_SELECT}`).eq("teacher_id", offer.teacher_id).eq("is_active", true).neq("id", offer.id).limit(6),
    isMine ? Promise.resolve(new Set<string>()) : bookableTeacherIds(supabase, [offer.teacher_id]),
  ]);
  // 同性限定・ブロックなどで申し込めない相手か（理由の詳細や性別は表示しない）
  const matchable = isMine || allowed.has(offer.teacher_id);
  const slots = openSlots.filter((s) => minutesBetween(s.start_at, s.end_at) >= offer.duration_min);
  const { tone } = categoryMeta(offer.field_code);
  const canBook = !isMine && matchable && offer.is_active && slots.length > 0 && balance >= 1;

  return (
    <div className="pb-24 lg:pb-0">
      {sp.created === "1" && (
        <p role="status" className="mb-5 rounded-md bg-success-soft px-4 py-3 text-sm text-success">
          カードを公開しました。次は<Link href="/slots" className="font-bold underline">空き枠</Link>を登録しましょう。
        </p>
      )}

      <nav aria-label="パンくず" className="mb-2 flex items-center gap-1 text-xs text-text-sub">
        <Link href="/search" className="inline-flex min-h-11 items-center hover:text-primary">さがす</Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link href={`/search?field=${offer.field_code}`} className="inline-flex min-h-11 items-center hover:text-primary">{fieldLabel[offer.field_code]}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_--spacing(96)] lg:items-start">
        <article className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-lg border border-border">
            <SkillThumbnail field={offer.field_code} kind={offer.kind} durationMin={offer.duration_min} size="hero" />
          </div>

          <header className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {cross && <Badge tone="point" icon={<Shuffle className="size-3" aria-hidden />}>あなたにとって異分野</Badge>}
              <Badge category={tone}>{fieldLabel[offer.field_code]}</Badge>
              {t.same_gender_only && <Badge tone="primary" icon={<ShieldCheck className="size-3" aria-hidden />}>同性からの申し込みのみ</Badge>}
              {!offer.is_active && <Badge tone="danger">非公開</Badge>}
            </div>
            <h1 className="text-2xl leading-snug sm:text-3xl">{offer.title}</h1>
            <p className="flex items-baseline gap-1 text-primary">
              <Ticket className="size-5 self-center" aria-hidden />
              <span className="text-2xl font-bold">1</span>
              <span className="font-bold">枚</span>
              <span className="text-sm text-text-sub">/ {offer.duration_min}分</span>
            </p>
          </header>

          <section className="rounded-lg bg-primary-soft p-4">
            <h2 className="text-xs font-bold text-primary">専門外の人へのひとこと</h2>
            <p className="mt-1">{offer.hook}</p>
          </section>

          {offer.description && (
            <section>
              <h2 className="mb-2 text-lg">くわしい内容</h2>
              <p className="whitespace-pre-wrap text-text">{offer.description}</p>
            </section>
          )}

          {offer.want_to_hear && (
            <section className="rounded-lg border-2 border-dashed border-point/40 bg-point-soft p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-point">
                <Shuffle className="size-4" aria-hidden />
                あなたの分野から聞きたいこと
              </h2>
              <p className="mt-1">{offer.want_to_hear}</p>
            </section>
          )}

          {offer.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="タグ">
              {offer.tags.map((tag) => (
                <li key={tag}>
                  <Link href={`/search?q=${encodeURIComponent(tag)}`} className="flex min-h-11 items-center rounded-full border border-border bg-surface px-3 text-sm text-text-sub hover:border-primary hover:text-primary">
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <section aria-labelledby="teacher-heading">
            <h2 id="teacher-heading" className="mb-3 text-lg">話す人</h2>
            <Card className="flex gap-4">
              <Avatar seed={t.id} name={t.display_name} size="lg" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
                  {t.display_name}
                  {t.is_official && <OfficialBadge />}
                </p>
                <p className="text-sm text-text-sub">
                  {[t.faculty?.name, t.grade && GRADE_LABEL[t.grade], t.field_code && fieldLabel[t.field_code]].filter(Boolean).join(" ・ ")}
                </p>
                {t.bio && <p className="mt-2 whitespace-pre-wrap text-sm">{t.bio}</p>}
              </div>
            </Card>
          </section>
        </article>

        {/* 予約ボックス（PC は右に追従、SP は本文の下） */}
        <aside id="booking" aria-label="予約" className="scroll-mt-20 lg:sticky lg:top-24">
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg">
              <CalendarClock className="size-5 text-primary" aria-hidden />
              予約する
            </h2>
            {isMine ? (
              <div className="space-y-2">
                <p className="text-sm text-text-sub">あなたのカードです。</p>
                <ButtonLink href={`/offers/${offer.id}/edit`} variant="outline" className="w-full">
                  <Pencil className="size-4" aria-hidden />
                  カードを編集
                </ButtonLink>
                <ButtonLink href="/slots" className="w-full">空き枠を管理</ButtonLink>
              </div>
            ) : !offer.is_active ? (
              <EmptyState title="このカードは現在非公開です" />
            ) : !matchable ? (
              <EmptyState title="このカードには申し込めません" icon={<ShieldCheck className="size-7" />}>
                話す人の安心設定（同性からの申し込みのみ など）により、申し込みを受け付けていません。
              </EmptyState>
            ) : slots.length === 0 ? (
              <EmptyState title="いま予約できる空き枠はありません" icon={<CalendarClock className="size-7" />}>
                しばらくしてからもう一度見てみてください。
              </EmptyState>
            ) : balance < 1 ? (
              <EmptyState
                title="チケットがありません"
                icon={<Ticket className="size-7" />}
                action={<ButtonLink href="/offers/new" variant="pill">カードを出してみる</ButtonLink>}
              >
                誰かに教えると1枚もらえます。毎月1枚の配布もあります。
              </EmptyState>
            ) : (
              <BookingForm
                offerId={offer.id}
                balance={balance}
                slots={slots.map((s) => ({ id: s.id, label: formatSlot(s.start_at, s.end_at), place: placeLabel(s), online: s.mode === "online" }))}
              />
            )}
          </Card>
        </aside>
      </div>

      {(others ?? []).length > 0 && (
        <section className="mt-14" aria-labelledby="others-heading">
          <h2 id="others-heading" className="mb-4 text-xl">{t.display_name}さんのほかのカード</h2>
          <SkillCarousel label={`${t.display_name}さんのほかのカード`}>
            {(others as OfferWithTeacher[]).map((o) => (
              <SkillCard key={o.id} data={toCard(o, cross, slots, fieldLabel)} />
            ))}
          </SkillCarousel>
        </section>
      )}

      {/* SP：画面下に固定の予約バー */}
      {canBook && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-surface/95 px-4 py-3 shadow-float backdrop-blur md:bottom-0 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <p className="flex items-baseline gap-0.5 text-primary">
              <Ticket className="size-4 self-center" aria-hidden />
              <span className="text-xl font-bold">1</span>
              <span className="text-sm font-bold">枚</span>
              <span className="ml-1 text-xs text-text-sub">/ {offer.duration_min}分・空き{slots.length}枠</span>
            </p>
            <a href="#booking" className={buttonClass("accent")}>日時をえらぶ</a>
          </div>
        </div>
      )}
    </div>
  );
}
