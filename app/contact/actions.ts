"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyDbError } from "@/lib/auth";
import { INQUIRY_CATEGORY_LABEL, isInquiryCategory } from "@/lib/inquiry";
import { notify } from "@/lib/notify";
import type { ActionState } from "@/lib/types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** ログインしていない人からの受け付けの上限（いたずら・大量送信よけ） */
const GUEST_LIMIT_PER_EMAIL_PER_HOUR = 3;
const GUEST_LIMIT_TOTAL_PER_HOUR = 30;

export async function submitInquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // 人には見えない入力欄。機械的な送信だけが埋めるので、受け付けたふりをして捨てる
  if (String(formData.get("website") ?? "") !== "") return { ok: true, message: "送信しました" };

  const category = String(formData.get("category") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!isInquiryCategory(category)) return { error: "種類を選んでください" };
  if (body.length < 5) return { error: "内容を5文字以上で書いてください" };
  if (body.length > 2000) return { error: "内容は2000文字までです" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.rpc("submit_inquiry", { p_category: category, p_body: body });
    if (error) return { error: friendlyDbError(error, "送信できませんでした。時間をおいてもう一度お試しください") };
  } else {
    const email = String(formData.get("reply_email") ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) return { error: "返信を受け取るメールアドレスを入力してください" };

    const admin = createAdminClient();
    if (!admin) return { error: "いまは受け付けできません。時間をおいてもう一度お試しください" };

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ count: byEmail }, { count: total }] = await Promise.all([
      admin.from("inquiries").select("id", { count: "exact", head: true }).is("user_id", null).eq("reply_email", email).gte("created_at", since),
      admin.from("inquiries").select("id", { count: "exact", head: true }).is("user_id", null).gte("created_at", since),
    ]);
    if ((byEmail ?? 0) >= GUEST_LIMIT_PER_EMAIL_PER_HOUR || (total ?? 0) >= GUEST_LIMIT_TOTAL_PER_HOUR) {
      return { error: "短い時間に送信が集中しています。1時間ほどおいてからお試しください" };
    }

    const { error } = await admin.from("inquiries").insert({ category, body, reply_email: email });
    if (error) {
      console.error("guest inquiry insert failed", { code: error.code, message: error.message });
      return { error: "送信できませんでした。時間をおいてもう一度お試しください" };
    }
  }

  after(() => notifyAdmins(category, body));
  revalidatePath("/contact");
  return {
    ok: true,
    message: user
      ? "送信しました。返信はこのページと、登録しているメールアドレスに届きます"
      : "送信しました。返信は入力したメールアドレスに届きます",
  };
}

/** 運営の全員に「新しい問い合わせ」を知らせる */
async function notifyAdmins(category: string, body: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: admins } = await admin.from("profiles").select("id").eq("is_admin", true);
  const excerpt = body.length > 300 ? `${body.slice(0, 300)}…` : body;
  await Promise.all(
    (admins ?? []).map((a) =>
      notify({
        userId: a.id as string,
        subject: `新しい問い合わせ（${INQUIRY_CATEGORY_LABEL[category] ?? category}）`,
        body: `問い合わせが届きました。\n\n${excerpt}\n\n運営ページから返信できます。`,
        path: "/admin#inquiries",
      }),
    ),
  );
}
