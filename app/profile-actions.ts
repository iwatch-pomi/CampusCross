"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyDbError, getCurrentMember } from "@/lib/auth";
import { CONTACT_INFO_ERROR, hasContactInfo } from "@/lib/safety";
import { TERMS_VERSION } from "@/lib/content";
import type { ActionState } from "@/lib/types";

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user, profile } = await getCurrentMember();
  if (profile.moderation_status !== "active") redirect("/suspended");

  const displayName = text(formData, "display_name");
  const facultyId = text(formData, "faculty_id");
  const fieldCode = text(formData, "field_code");
  const bio = text(formData, "bio");
  const gender = String(formData.get("gender") ?? "unspecified");
  const sameGenderOnly = formData.get("same_gender_only") === "on";

  if (!displayName || !facultyId || !fieldCode) {
    return { error: "表示名・学部・分野は必須です" };
  }
  if (displayName.length > 30) return { error: "表示名は30文字以内にしてください" };
  if (/[0-9]{5,}/.test(displayName)) return { error: "表示名に学籍番号のような数字の並びは使えません" };
  if (hasContactInfo(displayName) || hasContactInfo(bio)) return { error: CONTACT_INFO_ERROR };
  if (!["female", "male", "unspecified"].includes(gender)) return { error: "性別の選択が不正です" };
  if (sameGenderOnly && gender === "unspecified") {
    return { error: "同性限定を使うには、性別（女性／男性）を選んでください" };
  }

  // 性別を先に保存する（同性限定の設定は性別の申告が前提のため）
  const { error: privateError } = await supabase
    .from("profile_private")
    .update({
      gender,
      contact_email: text(formData, "contact_email"),
      notify_by_email: formData.get("notify_by_email") === "on",
    })
    .eq("user_id", user.id);
  if (privateError) return { error: "通知用メールアドレスの形式を確認してください" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      faculty_id: facultyId,
      field_code: fieldCode,
      grade: text(formData, "grade"),
      bio,
      same_gender_only: sameGenderOnly,
    })
    .eq("id", user.id);
  if (error) return { error: friendlyDbError(error, "プロフィールを保存できませんでした（文字数を確認してください）") };

  // 利用規約への同意（未同意、または版が古い人だけ）
  if (profile.terms_version !== TERMS_VERSION) {
    if (formData.get("agree_terms") !== "on") {
      return { error: "利用規約・安全ガイドラインへの同意が必要です" };
    }
    const { error: termsError } = await supabase.rpc("agree_terms", { p_version: TERMS_VERSION });
    if (termsError) return { error: friendlyDbError(termsError, "同意を記録できませんでした") };
  }

  revalidatePath("/", "layout");
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") ? next : "/");
}
