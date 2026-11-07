import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, MessageSquareText, ShieldCheck, Shuffle, Video } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { CancelForm, CompleteForm, SafetyForms, SafetyReviewForm, ThanksForm } from "@/components/booking-actions";
import { placeLabel, PLACES } from "@/lib/safety";
import { Avatar, Badge, Card } from "@/components/ui";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { GRADE_LABEL } from "@/lib/constants";
import { formatDateTime, formatSlot, hasStarted } from "@/lib/format";
import type { Booking, PublicProfile, Slot } from "@/lib/types";

type Row = Booking & {
  slot: Slot;
  offer: { id: string; title: string; kind: string; duration_min: number };
  learner: PublicProfile;
  teacher: PublicProfile;
};

const PERSON = "id, display_name, faculty_id, field_code, grade, bio, same_gender_only, faculty:faculties(name)";

export default async function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await requireOnboarded();

  const { data } = await supabase
    .from("bookings")
    .select(
      `*, slot:slots(*), offer:offers(id, title, kind, duration_min),
       learner:profiles!bookings_learner_id_fkey(${PERSON}),
       teacher:profiles!bookings_teacher_id_fkey(${PERSON})`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const b = data as Row;

  const [{ data: secret }, { data: myReview }] = await Promise.all([
    b.slot.place === "zoom" && b.status !== "cancelled"
      ? supabase.from("slot_secrets").select("meeting_url").eq("slot_id", b.slot_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("safety_reviews").select("id").eq("booking_id", b.id).eq("reviewer_id", profile.id).maybeSingle(),
  ]);

  const iAmLearner = b.learner_id === profile.id;
  const other = iAmLearner ? b.teacher : b.learner;
  const started = hasStarted(b.slot.start_at);
  const online = b.slot.mode === "online";
  // 安全レビュー: 開始時刻を過ぎていて、開始前のキャンセルでなく、まだ回答していないとき
  const cancelledBeforeStart = b.status === "cancelled" && !!b.cancelled_at && b.cancelled_at < b.slot.start_at;
  const canReview = started && !cancelledBeforeStart && !myReview;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {sp.booked === "1" && b.status === "booked" && (
        <p role="status" className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">
          予約が確定しました。チケット1枚を仮押さえしています（キャンセルすると戻ります）。
        </p>
      )}

      {/* チケットの半券のような予約カード */}
      <div className="drop-shadow-card">
        <article className="ticket-notch overflow-hidden rounded-lg border border-border bg-surface" style={{ ["--notch-y" as string]: "calc(100% - 5.5rem)" }}>
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge booking={b} started={started} />
              {b.is_cross_field && <Badge tone="point" icon={<Shuffle className="size-3" aria-hidden />}>異分野</Badge>}
              <Badge tone="muted">{iAmLearner ? "あなたが学ぶ" : "あなたが教える"}</Badge>
            </div>
            <h1 className="text-xl leading-snug sm:text-2xl">
              <Link href={`/offers/${b.offer.id}`} className="hover:text-primary hover:underline">{b.offer.title}</Link>
            </h1>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={<CalendarClock className="size-5" />} label="日時">{formatSlot(b.slot.start_at, b.slot.end_at)}</Info>
              <Info icon={online ? <Video className="size-5" /> : <MapPin className="size-5" />} label={online ? "オンライン" : "場所（学内の公共スペース）"}>
                {placeLabel(b.slot)}
                {secret?.meeting_url && (
                  <a href={secret.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-primary underline">
                    {secret.meeting_url}
                  </a>
                )}
              </Info>
            </div>
            {b.message && (
              <Info icon={<MessageSquareText className="size-5" />} label="予約時のひとこと">{b.message}</Info>
            )}
          </div>
          <div className="flex h-22 items-center gap-3 border-t-2 border-dashed border-border px-5">
            <Avatar seed={other.id} name={other.display_name} size="md" />
            <p className="min-w-0 text-sm">
              <span className="block text-xs text-text-sub">{iAmLearner ? "話す人" : "予約した人"}</span>
              <span className="block truncate font-bold">{other.display_name}さん</span>
              <span className="block truncate text-xs text-text-sub">
                {[other.faculty?.name, other.grade && GRADE_LABEL[other.grade]].filter(Boolean).join(" ")}
              </span>
            </p>
          </div>
        </article>
      </div>

      {b.status === "booked" && (
        <div className="space-y-1 rounded-md bg-bg-section px-4 py-3 text-xs text-text-sub">
          <p className="flex items-center gap-1.5 font-bold text-primary">
            <ShieldCheck className="size-4" aria-hidden />
            当日の約束
          </p>
          <p>・場所は「{PLACES[b.slot.place].label}」から移動しない（個室・研究室・自宅などへ誘われたら断って通報）</p>
          <p>・時間は{b.offer.duration_min}分まで。連絡先やSNSの交換は求めない・断ってよい</p>
          <p>・当日は表示名（ニックネーム）で声をかける</p>
        </div>
      )}

      {canReview && (
        <Card>
          <SafetyReviewForm bookingId={b.id} otherName={other.display_name} />
        </Card>
      )}
      {myReview && (
        <p className="flex items-center gap-1.5 text-xs text-text-sub">
          <ShieldCheck className="size-4 text-success" aria-hidden />
          安全レビューは回答済みです（相手には表示されません）
        </p>
      )}

      {b.status === "cancelled" && (
        <Card className="text-sm">
          {b.cancelled_by === profile.id ? "あなたが" : `${other.display_name}さんが`}キャンセルしました
          {b.cancelled_at && `（${formatDateTime(b.cancelled_at)}）`}。
          {b.cancel_reason && <p className="mt-1 text-text-sub">理由: {b.cancel_reason}</p>}
        </Card>
      )}

      {b.status === "completed" && (
        <Card className="space-y-4 text-sm">
          <p>
            {b.auto_completed ? "終了から48時間たったため、自動で完了になりました。" : "完了しました。"}
            {iAmLearner ? "チケット1枚が相手に届きました。" : "チケットを1枚受け取りました。"}
          </p>
          {b.thanks_message ? (
            <TestimonialCard
              quote={b.thanks_message}
              name={`${b.learner.display_name}さん`}
              attribute={[b.learner.faculty?.name, b.learner.grade && GRADE_LABEL[b.learner.grade]].filter(Boolean).join(" ")}
              seed={b.learner.id}
              footnote="からのお礼コメント"
            />
          ) : (
            iAmLearner && <ThanksForm bookingId={b.id} />
          )}
        </Card>
      )}

      {b.status === "booked" && iAmLearner && started && (
        <Card>
          <CompleteForm bookingId={b.id} teacherName={b.teacher.display_name} />
        </Card>
      )}
      {b.status === "booked" && iAmLearner && !started && (
        <CancelForm bookingId={b.id} label="予約をキャンセルする" hint="開始時刻まではキャンセルできます。チケットは戻ります。" />
      )}
      {b.status === "booked" && !iAmLearner && (
        <CancelForm
          bookingId={b.id}
          label={started ? "相手が来なかった（キャンセル扱いにする）" : "予約をキャンセルする"}
          hint="相手にチケットが戻ります。都合が悪くなったら早めに伝えましょう。"
        />
      )}

      <SafetyForms bookingId={b.id} />
    </div>
  );
}

function StatusBadge({ booking, started }: { booking: Booking; started: boolean }) {
  if (booking.status === "completed") return <Badge tone="success">完了</Badge>;
  if (booking.status === "cancelled") return <Badge tone="danger">キャンセル</Badge>;
  return <Badge tone="primary">{started ? "完了待ち" : "予約確定"}</Badge>;
}

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md bg-bg-section p-3 text-sm">
      <span className="mt-0.5 shrink-0 text-primary" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-text-sub">{label}</span>
        <span className="block break-words font-bold">{children}</span>
      </span>
    </div>
  );
}
