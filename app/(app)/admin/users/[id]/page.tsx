import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { ACTION_LABEL, REPORT_SELECT, STATUS_LABEL, STATUS_TONE, type ReportRow } from "@/lib/admin";
import { FEELING_LABEL, REPORT_REASON_LABEL, REVIEW_FLAGS } from "@/lib/safety";
import { GRADE_LABEL } from "@/lib/constants";
import { formatDateTime, todayJst } from "@/lib/format";
import { Avatar, Badge, Card, EmptyState, OfficialBadge } from "@/components/ui";
import { OfficialBadgeForm, ReferralForm, ResolveReportForm, StatusForm } from "@/components/admin-forms";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "ユーザーの確認" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FLAG_LABEL = Object.fromEntries(REVIEW_FLAGS.map((f) => [f.code, f.label]));

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  // URL の id は、そのまま問い合わせの条件に入れるので UUID の形だけを受け付ける
  if (!UUID.test(id)) notFound();

  const [{ data: user }, { data: priv }, { data: reportRows }, { data: reviews }, { data: referrals }, { data: actions }, { count: bookingCount }, { facultyName }] =
    await Promise.all([
      supabase.rpc("admin_profiles", { p_ids: [id] }).maybeSingle<Profile>(),
      supabase.from("profile_private").select("university_email").eq("user_id", id).maybeSingle(),
      supabase.from("reports").select(REPORT_SELECT).eq("target_user_id", id).order("created_at", { ascending: false }),
      supabase
        .from("safety_reviews")
        .select("id, feeling, flags, comment, created_at, booking_id, reviewer:profiles!safety_reviews_reviewer_id_fkey(display_name)")
        .eq("reviewee_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("university_referrals").select("*").eq("target_id", id).order("referred_at", { ascending: false }),
      supabase.from("moderation_actions").select("*").eq("target_id", id).order("created_at", { ascending: false }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).or(`learner_id.eq.${id},teacher_id.eq.${id}`),
      loadMasters(supabase),
    ]);
  if (!user) notFound();
  const reports = (reportRows ?? []) as unknown as ReportRow[];
  const openReports = reports.filter((r) => r.status !== "resolved");

  return (
    <div className="space-y-8">
      <Link href="/admin" className="inline-flex min-h-11 items-center gap-1 text-sm text-text-sub hover:text-primary">
        <ChevronLeft className="size-4" aria-hidden />
        運営トップへ
      </Link>

      <Card className="flex flex-wrap items-center gap-4">
        <Avatar seed={user.id} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl">
            {user.display_name}
            {user.is_official && <OfficialBadge />}
            {user.is_admin && <Badge tone="muted">運営の権限あり</Badge>}
          </h1>
          <p className="text-sm text-text-sub">
            {[user.faculty_id && facultyName[user.faculty_id], user.grade && GRADE_LABEL[user.grade]].filter(Boolean).join(" ・ ")}
          </p>
          <p className="mt-1 break-all text-sm">
            <span className="text-text-sub">大学メール：</span>
            <span className="font-bold">{priv?.university_email}</span>
          </p>
          <p className="text-xs text-text-sub">登録 {formatDateTime(user.created_at)} ・ 予約 {bookingCount ?? 0}件</p>
        </div>
        <Badge tone={STATUS_TONE[user.moderation_status]}>{STATUS_LABEL[user.moderation_status]}</Badge>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_--spacing(96)] lg:items-start">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="r-heading">
            <h2 id="r-heading" className="mb-3 text-lg">この人への通報（{reports.length}件）</h2>
            {reports.length === 0 ? (
              <EmptyState title="通報はありません" />
            ) : (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Card className="p-4 text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="danger">{REPORT_REASON_LABEL[r.reason] ?? r.reason}</Badge>
                        <Badge tone="muted">{r.source === "review" ? "安全レビューから" : "通報"}</Badge>
                        <Badge tone={r.status === "resolved" ? "success" : "warn"}>{r.status === "resolved" ? "対応済み" : r.status === "reviewing" ? "確認中" : "未対応"}</Badge>
                        <span className="text-xs text-text-sub">{formatDateTime(r.created_at)} ・ 通報者 {r.reporter?.display_name}</span>
                      </div>
                      {r.detail && <p className="mt-2 whitespace-pre-wrap">{r.detail}</p>}
                      {r.resolution && <p className="mt-2 text-text-sub">対応：{r.resolution}</p>}
                      {r.status !== "resolved" && <ResolveReportForm reportId={r.id} />}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="sr-heading">
            <h2 id="sr-heading" className="mb-3 text-lg">この人についての安全レビュー（{(reviews ?? []).length}件）</h2>
            {(reviews ?? []).length === 0 ? (
              <EmptyState title="まだありません" />
            ) : (
              <ul className="space-y-2">
                {(reviews as unknown as { id: string; feeling: keyof typeof FEELING_LABEL; flags: string[]; comment: string | null; created_at: string; reviewer: { display_name: string } | null }[]).map((rv) => (
                  <li key={rv.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={rv.feeling === "safe" ? "success" : rv.feeling === "uneasy" ? "warn" : "danger"}>{FEELING_LABEL[rv.feeling]}</Badge>
                      <span className="text-xs text-text-sub">{formatDateTime(rv.created_at)} ・ 回答者 {rv.reviewer?.display_name}</span>
                    </div>
                    {rv.flags.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-danger">
                        {rv.flags.map((f) => <li key={f}>{FLAG_LABEL[f] ?? f}</li>)}
                      </ul>
                    )}
                    {rv.comment && <p className="mt-2 whitespace-pre-wrap">{rv.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="log-heading">
            <h2 id="log-heading" className="mb-3 text-lg">対応記録</h2>
            {(actions ?? []).length === 0 ? (
              <EmptyState title="まだありません" />
            ) : (
              <ul className="space-y-2 text-sm">
                {(actions as { id: number; action: string; note: string | null; created_at: string }[]).map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-surface p-3">
                    <span className="text-xs text-text-sub">{formatDateTime(a.created_at)}</span>
                    <span className="ml-2 font-bold">{ACTION_LABEL[a.action] ?? a.action}</span>
                    {a.note && <p className="mt-1 text-text-sub">{a.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          {user.is_admin && (
            <Card>
              <h2 className="mb-1 text-lg">公式運営バッジ</h2>
              <p className="mb-3 text-xs text-text-sub">
                付けると、カード・カードの詳細・予約の画面で、名前の横に「公式運営」と表示されます。運営の権限がある人にだけ付けられます。
              </p>
              <OfficialBadgeForm userId={user.id} current={user.is_official} />
            </Card>
          )}
          <Card>
            <h2 className="mb-3 text-lg">利用状態を変える</h2>
            <StatusForm
              userId={user.id}
              current={user.moderation_status}
              reports={openReports.map((r) => ({ id: r.id, label: `${REPORT_REASON_LABEL[r.reason] ?? r.reason}（${formatDateTime(r.created_at)}）` }))}
            />
          </Card>
          <Card>
            <h2 className="mb-1 text-lg">大学の関係部署への通報</h2>
            <p className="mb-3 text-xs text-text-sub">
              悪質なケースは、大学の窓口に運営から連絡したうえで、ここに記録します。提供する情報は規約で定めた範囲（大学メール・表示名・学部・学年・通報の内容と日時）に限ります。
            </p>
            {(referrals ?? []).length > 0 && (
              <ul className="mb-3 space-y-2 text-sm">
                {(referrals as { id: string; department: string; summary: string; referred_at: string }[]).map((rf) => (
                  <li key={rf.id} className="rounded-md bg-bg-section p-3">
                    <span className="font-bold">{rf.referred_at}</span> {rf.department}
                    <p className="text-text-sub">{rf.summary}</p>
                  </li>
                ))}
              </ul>
            )}
            <ReferralForm userId={user.id} today={todayJst()} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
