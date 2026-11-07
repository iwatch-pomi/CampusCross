"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allowedEmailDomains, isAllowedEmail } from "@/lib/constants";

export type LoginState =
  | { step: "email"; error?: string }
  | { step: "code"; email: string; error?: string };

/** 1回目はコードを送り、2回目以降はコードを確かめる */
export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  return prev.step === "email" ? sendCode(formData) : verifyCode(prev.email, formData);
}

async function sendCode(formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const domains = allowedEmailDomains();

  if (!isAllowedEmail(email, domains)) {
    return {
      step: "email",
      error: `学内のメールアドレス（@${domains.join(" / @")}）を入力してください`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return { step: "email", error: toJapanese(error.message) };
  }
  return { step: "code", email };
}

async function verifyCode(email: string, formData: FormData): Promise<LoginState> {
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");

  if (!/^\d{6,10}$/.test(token)) {
    return { step: "code", email, error: "メールに届いた数字のコードを入力してください" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error?.code === "user_banned" || error?.message?.includes("banned")) {
    return {
      step: "code",
      email,
      error: "このアカウントは、利用規約・安全ガイドラインへの違反により永久に利用停止されています",
    };
  }
  if (error || !data.user) {
    return { step: "code", email, error: "コードが違うか、有効期限が切れています" };
  }

  // プロフィール未登録ならホームを経由せず、直接プロフィール登録へ
  const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).single();
  redirect(profile?.onboarded ? "/" : "/onboarding");
}

function toJapanese(message: string): string {
  if (/rate limit|too many|seconds/i.test(message)) {
    return "短い時間に何度も送信されました。少し待ってからもう一度お試しください";
  }
  if (message.includes("学内")) return message;
  return "コードを送信できませんでした。時間をおいてもう一度お試しください";
}
