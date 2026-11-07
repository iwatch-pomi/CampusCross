import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { CancelForm, CompleteForm, SafetyForms, ThanksForm } from "@/components/booking-actions";
import { Badge, Card } from "@/components/ui";
import { GRADE_LABEL } from "@/lib/constants";
import { formatDateTime, formatSlot, hasStarted } from "@/lib/format";
import type { Booking, PublicProfile, Slot } from "@/lib/types";

type Row = Booking & {
  slot: Slot;
  offer: { id: string; title: string; kind: string; duration_min: number };
  learner: PublicProfile;
  teacher: PublicProfile;
};

const PERSON = "id, display_name, faculty_id, field_code, grade, department, bio, faculty:faculties(name)";

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

  const iAmLearner = b.learner_id === profile.id;
  const other = iAmLearner ? b.teacher : b.learner;
  const started = hasStarted(b.slot.start_at);

  return (
    <div className="space-y-5">
      {sp.booked === "1" && b.status === "booked" && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          予約が確定しました。チケット1枚を仮押さえしています（キャンセルすると戻ります）。
        </p>
      )}

      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <StatusBadge booking={b} started={started} />
          {b.is_cross_field && <Badge tone="cross">異分野</Badge>}
          <Badge tone="muted">{iAmLearner ? "あなたが学ぶ" : "あなたが教える"}</Badge>
        </div>
        <Link href={`/offers/${b.offer.id}`} className="text-xl font-bold leading-snug hover:underline">
          {b.offer.title}
        </Link>
      </div>

      <Card className="space-y-3">
        <Row label="日時">{formatSlot(b.slot.start_at, b.slot.end_at)}</Row>
        <Row label={b.slot.mode === "online" ? "オンライン" : "場所（対面）"}>{b.slot.location}</Row>
        <Row label={iAmLearner ? "話す人" : "予約した人"}>
          <span className="font-semibold">{other.display_name}</span>
          <span className="text-stone-600">
            {" "}・ {other.faculty?.name}
            {other.grade && ` ${GRADE_LABEL[other.grade] ?? ""}`}
          </span>
        </Row>
        {b.message && <Row label="予約時のひとこと">{b.message}</Row>}
        {b.status === "booked" && (
          <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-600">
            当日は表示名で声をかけてください。連絡先の交換は任意です。
          </p>
        )}
      </Card>

      {b.status === "cancelled" && (
        <Card className="text-sm text-stone-700">
          {b.cancelled_by === profile.id ? "あなたが" : `${other.display_name}さんが`}キャンセルしました
          {b.cancelled_at && `（${formatDateTime(b.cancelled_at)}）`}。
          {b.cancel_reason && <p className="mt-1 text-stone-600">理由: {b.cancel_reason}</p>}
        </Card>
      )}

      {b.status === "completed" && (
        <Card className="space-y-3 text-sm">
          <p className="text-stone-700">
            {b.auto_completed ? "終了から48時間たったため、自動で完了になりました。" : "完了しました。"}
            {iAmLearner ? "チケット1枚が相手に届きました。" : "チケットを1枚受け取りました。"}
          </p>
          {b.thanks_message ? (
            <blockquote className="rounded-xl border-l-4 border-teal-400 bg-teal-50 px-3 py-2 text-teal-900">
              {b.thanks_message}
            </blockquote>
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
  if (booking.status === "completed") return <Badge tone="ok">完了</Badge>;
  if (booking.status === "cancelled") return <Badge tone="warn">キャンセル</Badge>;
  return <Badge tone="neutral">{started ? "完了待ち" : "予約確定"}</Badge>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <div className="mt-0.5 text-stone-900">{children}</div>
    </div>
  );
}
