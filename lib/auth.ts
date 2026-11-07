import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** ログイン中のユーザーとプロフィールを返す（1リクエストにつき1回だけ問い合わせる） */
export const getCurrentMember = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  return { supabase, user, profile };
});

/** プロフィール登録済みであることを要求する */
export async function requireOnboarded() {
  const member = await getCurrentMember();
  if (!member.profile.onboarded) redirect("/onboarding");
  return member;
}

/** 異分野かどうか（DB の book_slot と同じ判定: 学部または分野が違う） */
export function isCrossField(
  me: { faculty_id: string | null; field_code: string | null },
  other: { faculty_id: string | null; field_code: string | null },
): boolean {
  return me.faculty_id !== other.faculty_id || me.field_code !== other.field_code;
}
