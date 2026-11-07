"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await getCurrentMember();

  const displayName = text(formData, "display_name");
  const facultyId = text(formData, "faculty_id");
  const fieldCode = text(formData, "field_code");
  if (!displayName || !facultyId || !fieldCode) {
    return { error: "表示名・学部・分野は必須です" };
  }
  if (displayName.length > 30) return { error: "表示名は30文字以内にしてください" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      faculty_id: facultyId,
      field_code: fieldCode,
      department: text(formData, "department"),
      grade: text(formData, "grade"),
      bio: text(formData, "bio"),
    })
    .eq("id", user.id);
  if (error) return { error: "プロフィールを保存できませんでした（文字数を確認してください）" };

  const contactEmail = text(formData, "contact_email");
  const { error: privateError } = await supabase
    .from("profile_private")
    .update({
      contact_email: contactEmail,
      notify_by_email: formData.get("notify_by_email") === "on",
    })
    .eq("user_id", user.id);
  if (privateError) return { error: "通知用メールアドレスの形式を確認してください" };

  revalidatePath("/", "layout");
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") ? next : "/");
}
