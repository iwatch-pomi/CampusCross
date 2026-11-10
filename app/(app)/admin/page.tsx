import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Flag, ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { ACTION_LABEL, REPORT_SELECT, STATUS_LABEL, STATUS_TONE, type ReportRow } from "@/lib/admin";
import { REPORT_REASON_LABEL } from "@/lib/safety";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, EmptyState, OfficialBadge, PageTitle } from "@/components/ui";
import type { ModerationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "運営" };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [{ data: reportRows }, { data: held }, { data: actions }, { data: admins }] = await Promise.all([
    supabase.from("reports").select(REPORT_SELECT).in("status", ["open", "reviewing"]).order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, display_name, moderation_status, moderated_at").neq("moderation_status", "active").order("moderated_at", { ascending: false }).limit(50),
    supabase
      .from("moderation_actions")
      .select("id, action, note, created_at, target:profiles!moderation_actions_target_id_fkey(id, display_name)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("id, display_name, is_official").eq("is_admin", true).order("created_at"),
  ]);
  const reports = (reportRows ?? []) as unknown as ReportRow[];

  return (
    <div className="space-y-10">
      <PageTitle sub="通報と安全レビューを確認し、不適切な行為が事実として確認できたら永久凍結します。">運営</PageTitle>

      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="mb-3 flex items-center gap-2 text-lg">
          <Flag className="size-5 text-danger" aria-hidden />
          未対応の通報・安全レビュー（{reports.length}件）
        </h2>
        {reports.length === 0 ? (
          <EmptyState title="未対応の通報はありません" />
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Card className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="danger">{REPORT_REASON_LABEL[r.reason] ?? r.reason}</Badge>
                    <Badge tone="muted">{r.source === "review" ? "安全レビューから" : "通報"}</Badge>
                    {r.status === "reviewing" && <Badge tone="warn">確認中</Badge>}
                    <span className="text-xs text-text-sub">{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="text-sm">
                    <span className="text-text-sub">対象：</span>
                    <span className="font-bold">{r.target?.display_name}</span>
                    {r.target && <span className="ml-2"><Badge tone={STATUS_TONE[r.target.moderation_status]}>{STATUS_LABEL[r.target.moderation_status]}</Badge></span>}
                    <span className="ml-3 text-text-sub">通報者：{r.reporter?.display_name}</span>
                  </p>
                  {r.detail && <p className="whitespace-pre-wrap rounded-md bg-bg-section p-3 text-sm">{r.detail}</p>}
                  {r.target && (
                    <Link href={`/admin/users/${r.target.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">
                      この人を確認・対応する
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="held-heading">
        <h2 id="held-heading" className="mb-3 flex items-center gap-2 text-lg">
          <ShieldAlert className="size-5 text-warn" aria-hidden />
          停止中・凍結中のユーザー
        </h2>
        {(held ?? []).length === 0 ? (
          <EmptyState title="いません" />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {(held as { id: string; display_name: string; moderation_status: ModerationStatus; moderated_at: string | null }[]).map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 hover:bg-bg-section">
                  <span className="font-bold">{u.display_name}</span>
                  <span className="flex items-center gap-2 text-xs text-text-sub">
                    {u.moderated_at && formatDateTime(u.moderated_at)}
                    <Badge tone={STATUS_TONE[u.moderation_status]}>{STATUS_LABEL[u.moderation_status]}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="admins-heading">
        <h2 id="admins-heading" className="mb-1 flex items-center gap-2 text-lg">
          <BadgeCheck className="size-5 text-primary" aria-hidden />
          運営メンバーと公式運営バッジ
        </h2>
        <p className="mb-3 text-sm text-text-sub">名前を押すと、バッジを付けたり外したりできます。</p>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {(admins as { id: string; display_name: string; is_official: boolean }[] | null)?.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 hover:bg-bg-section">
                <span className="font-bold">{u.display_name || "（未登録）"}</span>
                {u.is_official ? <OfficialBadge /> : <span className="text-xs text-text-sub">バッジなし</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="log-heading">
        <h2 id="log-heading" className="mb-3 text-lg">最近の対応記録</h2>
        {(actions ?? []).length === 0 ? (
          <EmptyState title="まだ記録はありません" />
        ) : (
          <ul className="space-y-2 text-sm">
            {(actions as unknown as { id: number; action: string; note: string | null; created_at: string; target: { id: string; display_name: string } | null }[]).map((a) => (
              <li key={a.id} className="rounded-md border border-border bg-surface p-3">
                <span className="text-xs text-text-sub">{formatDateTime(a.created_at)}</span>
                <span className="ml-2 font-bold">{ACTION_LABEL[a.action] ?? a.action}</span>
                {a.target && (
                  <Link href={`/admin/users/${a.target.id}`} className="ml-2 text-primary underline">{a.target.display_name}</Link>
                )}
                {a.note && <p className="mt-1 text-text-sub">{a.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
