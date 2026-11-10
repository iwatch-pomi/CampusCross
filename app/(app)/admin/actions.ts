"use server";

import { revalidatePath } from "next/cache";
import { friendlyDbError, requireAdmin } from "@/lib/auth";
import { appLink, sendMail } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function replyInquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("inquiry_id") ?? "");
  const close = formData.get("intent") === "close";
  const reply = close ? null : text(formData, "reply");
  if (!close && !reply) return { error: "返信の内容を書いてください" };

  const { data: inquiry } = await supabase.from("inquiries").select("id, user_id, reply_email, body").eq("id", id).maybeSingle();
  if (!inquiry) return { error: "問い合わせが見つかりません" };

  const { error } = await supabase.rpc("admin_reply_inquiry", { p_id: id, p_reply: reply });
  if (error) return { error: friendlyDbError(error, "記録できませんでした") };

  let mailed = false;
  if (reply) mailed = await mailInquiryReply(inquiry, reply);

  revalidatePath("/admin");
  revalidatePath("/contact");
  if (close) return { ok: true, message: "返信せずに対応済みにしました" };
  return {
    ok: true,
    message: mailed ? "返信を送りました" : "返信を記録しました（メールは送れませんでした。ログインしている人はお問い合わせページで読めます）",
  };
}

/** 返信をメールで送る。宛先は、ログインしている人なら通知先メール（なければ大学メール）、そうでなければ入力された返信先 */
async function mailInquiryReply(
  inquiry: { user_id: string | null; reply_email: string | null; body: string },
  reply: string,
): Promise<boolean> {
  let to = inquiry.reply_email;
  if (inquiry.user_id) {
    const admin = createAdminClient();
    if (!admin) return false;
    const { data } = await admin.from("profile_private").select("university_email, contact_email").eq("user_id", inquiry.user_id).single();
    to = data?.contact_email || data?.university_email || null;
  }
  if (!to) return false;
  const quoted = inquiry.body.split("\n").map((l) => `> ${l}`).join("\n");
  return sendMail({
    to,
    subject: "お問い合わせへの返信",
    text: `お問い合わせありがとうございます。Campus-Cross 運営です。\n\n${reply}\n\n---\nいただいたお問い合わせ:\n${quoted}${
      inquiry.user_id ? appLink("/contact") : ""
    }\n\n---\nCampus-Cross 運営\nこのメールは送信専用です。続けてのご質問は、サイトのお問い合わせページからお送りください。`,
  });
}
