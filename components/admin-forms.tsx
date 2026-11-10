"use client";

import { useActionState, useState } from "react";
import { recordReferral, resolveReport, setOfficialBadge, setUserStatus } from "@/app/(app)/admin/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { CHOICE, Field, INPUT } from "./ui";
import type { ModerationStatus } from "@/lib/types";

export function StatusForm({
  userId,
  current,
  reports,
}: {
  userId: string;
  current: ModerationStatus;
  reports: { id: string; label: string }[];
}) {
  const [state, action] = useActionState(setUserStatus, undefined);
  const [status, setStatus] = useState<string>(current === "active" ? "on_hold" : current === "on_hold" ? "banned" : "active");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="user_id" value={userId} />
      <fieldset>
        <legend className="mb-2 text-sm font-bold">操作</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["on_hold", "一時停止"],
              ["banned", "永久凍結"],
              ["active", "解除"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className={`${CHOICE} items-center text-center text-sm font-bold`}>
              <input type="radio" name="status" value={v} checked={status === v} onChange={() => setStatus(v)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {reports.length > 0 && (
        <Field label="対象の通報（対応済みにする）" htmlFor="report_id">
          <select id="report_id" name="report_id" className={INPUT} defaultValue={reports[0].id}>
            <option value="">選ばない</option>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label={status === "banned" ? "確認した事実（必須）" : "メモ"} htmlFor="note" hint="通報・安全レビュー・当事者への確認など、判断の根拠を残してください">
        <textarea id="note" name="note" rows={3} maxLength={2000} required={status === "banned"} className={INPUT} />
      </Field>
      {status === "banned" && (
        <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger">
          <input type="checkbox" name="confirm" required className="mt-0.5 size-5 shrink-0 accent-danger" />
          ハラスメント・勧誘・出会い目的の行為を事実として確認しました。永久凍結すると、予約はすべて取り消され、ログインと再登録ができなくなります。
        </label>
      )}
      <FormMessage state={state} />
      <SubmitButton variant={status === "banned" ? "danger" : "primary"} className="w-full" pendingText="処理中…">
        {status === "banned" ? "永久凍結する" : status === "on_hold" ? "一時停止する" : "解除する"}
      </SubmitButton>
    </form>
  );
}

export function ResolveReportForm({ reportId }: { reportId: string }) {
  const [state, action] = useActionState(resolveReport, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="report_id" value={reportId} />
      <label className="sr-only" htmlFor={`resolution-${reportId}`}>対応の内容</label>
      <textarea id={`resolution-${reportId}`} name="resolution" rows={2} maxLength={1000} placeholder="対応の内容（例：当事者に確認、違反なし）" className={INPUT} />
      <div className="flex gap-2">
        <select name="status" aria-label="通報の状態" defaultValue="resolved" className={`${INPUT} w-auto`}>
          <option value="resolved">対応済み（処分なし）</option>
          <option value="reviewing">確認中にする</option>
        </select>
        <SubmitButton variant="outline" pendingText="…">記録</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function ReferralForm({ userId, today }: { userId: string; today: string }) {
  const [state, action] = useActionState(recordReferral, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <Field label="通報先の部署" htmlFor="department" required hint="例：学生支援の窓口、ハラスメント相談窓口">
        <input id="department" name="department" maxLength={100} required className={INPUT} />
      </Field>
      <Field label="通報した内容の要約" htmlFor="summary" required>
        <textarea id="summary" name="summary" rows={3} maxLength={2000} required className={INPUT} />
      </Field>
      <Field label="通報した日" htmlFor="referred_at">
        <input id="referred_at" name="referred_at" type="date" defaultValue={today} className={INPUT} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="outline" className="w-full" pendingText="記録中…">大学への通報を記録する</SubmitButton>
    </form>
  );
}

/** 公式運営バッジの付け外し（運営の権限がある人だけ） */
export function OfficialBadgeForm({ userId, current }: { userId: string; current: boolean }) {
  const [state, action] = useActionState(setOfficialBadge, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="on" value={current ? "0" : "1"} />
      <FormMessage state={state} />
      <SubmitButton variant={current ? "outline" : "primary"} className="w-full" pendingText="処理中…">
        {current ? "公式運営バッジを外す" : "公式運営バッジを付ける"}
      </SubmitButton>
    </form>
  );
}
