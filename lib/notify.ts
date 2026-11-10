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

    await sendMail({
      to: target.contact_email || target.university_email,
      subject,
      text: `${body}${appLink(path)}\n\n---\nCampus-Cross（通知はマイページから止められます）`,
    });
  } catch (e) {
    console.error("[notify:error]", e);
  }
}

export function appLink(path?: string): string {
  return path ? `\n\n${(process.env.APP_URL ?? "").replace(/\/$/, "")}${path}` : "";
}

/**
 * メールを1通送る（Resend）。件名には [Campus-Cross] を付ける。
 * 送れたら true。RESEND_API_KEY が未設定なら送らずにログだけ出して false。例外は投げない。
 */
export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[mail:skip] subject=${subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.NOTIFY_FROM, to, subject: `[Campus-Cross] ${subject}`, text }),
    });
    if (!res.ok) console.error(`[mail:error] ${res.status} ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.error("[mail:error]", e);
    return false;
  }
}
