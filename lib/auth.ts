import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";
import { TERMS_VERSION } from "./content";

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

/** プロフィール登録と規約への同意が済んでいて、停止中でないことを要求する */
export async function requireOnboarded() {
  const member = await getCurrentMember();
  if (member.profile.moderation_status !== "active") redirect("/suspended");
  if (!member.profile.onboarded || member.profile.terms_version !== TERMS_VERSION) redirect("/onboarding");
  return member;
}

/** 運営であることを要求する（運営でなければ 404 と同じ扱い） */
export async function requireAdmin() {
  const member = await requireOnboarded();
  if (!member.profile.is_admin) redirect("/");
  return member;
}

/** DB 関数が投げた日本語のエラー（errcode P0001 など）だけをそのまま見せ、それ以外は汎用の文言にする */
export function friendlyDbError(error: { code?: string; message: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === "P0001" || /[ぁ-んァ-ン一-龥]/.test(error.message)) return error.message;
  if (error.message.includes("display_name_no_id")) return "表示名に学籍番号のような数字の並びは使えません";
  if (error.message.includes("place_note_check")) return "目印に個室・研究室・自宅などは書けません（公共スペース内の目印だけにしてください）";
  if (error.message.includes("duration_check")) return "1回は30分までです";
  if (error.message.includes("meeting_url")) return "ZoomのURL（https://〜zoom.us/〜）を入力してください";
  return fallback;
}

/** 異分野かどうか（DB の book_slot と同じ判定: 学部または分野が違う） */
export function isCrossField(
  me: { faculty_id: string | null; field_code: string | null },
  other: { faculty_id: string | null; field_code: string | null },
): boolean {
  return me.faculty_id !== other.faculty_id || me.field_code !== other.field_code;
}
