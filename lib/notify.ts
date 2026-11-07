import "server-only";
import { createAdminClient } from "./supabase/admin";

type Mail = { userId: string; subject: string; body: string; path?: string };

/**
 * 通知メールを送る。宛先は通知用アドレス（未登録なら大学のメール）。
 * RESEND_API_KEY か SUPABASE_SERVICE_ROLE_KEY が未設定なら送らずにログだけ出す。
 * 通知の失敗で本来の操作を失敗させないよう、例外は投げない。
 */
export async function notify({ userId, subject, body, path }: Mail): Promise<void> {
  try {
    const admin = createAdminClient();
    const apiKey = process.env.RESEND_API_KEY;
    if (!admin || !apiKey) {
      console.info(`[notify:skip] to=${userId} subject=${subject}`);
      return;
    }

    const { data: target } = await admin
      .from("profile_private")
      .select("university_email, contact_email, notify_by_email")
      .eq("user_id", userId)
      .single();
    if (!target || !target.notify_by_email) return;

    const link = path ? `\n\n${(process.env.APP_URL ?? "").replace(/\/$/, "")}${path}` : "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM,
        to: target.contact_email || target.university_email,
        subject: `[Campus-Cross] ${subject}`,
        text: `${body}${link}\n\n---\nCampus-Cross（通知はマイページから止められます）`,
      }),
    });
    if (!res.ok) console.error(`[notify:error] ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("[notify:error]", e);
  }
}
