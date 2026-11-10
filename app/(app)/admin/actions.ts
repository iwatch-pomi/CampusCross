"use server";

import { revalidatePath } from "next/cache";
import { friendlyDbError, requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

export async function setUserStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = text(formData, "note");
  const reportId = text(formData, "report_id");

  if (!["active", "on_hold", "banned"].includes(status)) return { error: "操作を選んでください" };
  if (status === "banned") {
    if (!note) return { error: "永久凍結には、確認した事実（理由）の記録が必要です" };
    if (formData.get("confirm") !== "on") return { error: "永久凍結の確認にチェックしてください" };
  }

  const { error } = await supabase.rpc("admin_set_status", {
    p_user: userId,
    p_status: status,
    p_note: note,
    p_report_id: reportId,
  });
  if (error) return { error: friendlyDbError(error, "状態を変更できませんでした") };

  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message:
      status === "banned"
        ? "永久凍結しました。予約は取り消され、同じメールアドレスでは登録できなくなりました"
        : status === "on_hold"
          ? "一時停止しました"
          : "利用できる状態に戻しました",
  };
}

export async function resolveReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "resolved");
  const resolution = text(formData, "resolution");
  if (!resolution) return { error: "対応の内容を記録してください" };

  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_status: status === "reviewing" ? "reviewing" : "resolved",
    p_resolution: resolution,
  });
  if (error) return { error: friendlyDbError(error, "記録できませんでした") };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "記録しました" };
}

export async function recordReferral(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const department = text(formData, "department");
  const summary = text(formData, "summary");
  const referredAt = text(formData, "referred_at");
  if (!department || !summary) return { error: "通報先の部署と内容を入力してください" };

  const { error } = await supabase.rpc("admin_record_referral", {
    p_user: userId,
    p_department: department,
    p_summary: summary,
    p_referred_at: referredAt,
  });
  if (error) return { error: friendlyDbError(error, "記録できませんでした") };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "大学への通報を記録しました" };
}

export async function setOfficialBadge(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const on = formData.get("on") === "1";

  const { error } = await supabase.rpc("admin_set_official", { p_user: userId, p_on: on });
  if (error) return { error: friendlyDbError(error, "バッジを変更できませんでした") };

  revalidatePath("/", "layout");
  return { ok: true, message: on ? "公式運営バッジを付けました" : "公式運営バッジを外しました" };
}
