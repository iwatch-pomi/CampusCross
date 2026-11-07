import Link from "next/link";
import { notFound } from "next/navigation";
import { isCrossField, requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { loadOpenSlots, TEACHER_SELECT, type OfferWithTeacher } from "@/lib/offers";
import { BookingForm } from "@/components/booking-form";
import { Badge, ButtonLink, Card, Empty } from "@/components/ui";
import { GRADE_LABEL } from "@/lib/constants";
import { formatSlot, minutesBetween } from "@/lib/format";

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

  const slots = (await loadOpenSlots(supabase, [offer.teacher_id])).filter(
    (s) => minutesBetween(s.start_at, s.end_at) >= offer.duration_min,
  );
  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-5">
      {sp.created === "1" && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          カードを公開しました。次は<Link href="/slots" className="font-semibold underline">空き枠</Link>を登録しましょう。
        </p>
      )}

      <article className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {cross && <Badge tone="cross">異分野</Badge>}
          {offer.kind === "faculty_guide" && <Badge tone="guide">学部のしくみ</Badge>}
          <Badge>{fieldLabel[offer.field_code] ?? offer.field_code}</Badge>
          <Badge tone="muted">{offer.duration_min}分</Badge>
          {!offer.is_active && <Badge tone="warn">非公開</Badge>}
        </div>
        <h1 className="text-xl font-bold leading-snug">{offer.title}</h1>
        <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900">{offer.hook}</p>
        {offer.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{offer.description}</p>}
        {offer.want_to_hear && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
            <p className="text-xs font-semibold text-teal-800">あなたの分野から聞きたいこと</p>
            <p className="mt-0.5 text-teal-900">{offer.want_to_hear}</p>
          </div>
        )}
        {offer.tags.length > 0 && (
          <p className="flex flex-wrap gap-2 text-xs text-indigo-700">
            {offer.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </p>
        )}
      </article>

      <Card>
        <p className="text-xs font-semibold text-stone-500">話す人</p>
        <p className="mt-1 font-bold">{t.display_name}</p>
        <p className="text-sm text-stone-600">
          {t.faculty?.name}
          {t.department && ` ${t.department}`}
          {t.grade && ` ・ ${GRADE_LABEL[t.grade] ?? ""}`}
          {t.field_code && ` ・ ${fieldLabel[t.field_code]}`}
        </p>
        {t.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{t.bio}</p>}
      </Card>

      {isMine ? (
        <div className="flex gap-2">
          <ButtonLink href={`/offers/${offer.id}/edit`} variant="secondary" className="flex-1">カードを編集</ButtonLink>
          <ButtonLink href="/slots" className="flex-1">空き枠を管理</ButtonLink>
        </div>
      ) : !offer.is_active ? (
        <Empty>このカードは現在非公開です。</Empty>
      ) : slots.length === 0 ? (
        <Empty>いま予約できる空き枠はありません。</Empty>
      ) : balance < 1 ? (
        <Empty>
          チケットがありません。誰かに教えると1枚もらえます。
          <br />
          <Link href="/offers/new" className="mt-2 inline-block font-semibold text-indigo-700 underline">カードを出してみる</Link>
        </Empty>
      ) : (
        <Card>
          <BookingForm
            offerId={offer.id}
            balance={balance}
            slots={slots.map((s) => ({
              id: s.id,
              label: formatSlot(s.start_at, s.end_at),
              place: s.location,
              online: s.mode === "online",
            }))}
          />
        </Card>
      )}
    </div>
  );
}
