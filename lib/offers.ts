import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Offer, PublicProfile, Slot } from "./types";

export type OfferWithTeacher = Offer & { teacher: PublicProfile };

export const TEACHER_SELECT =
  "teacher:profiles!offers_teacher_id_fkey(id, display_name, faculty_id, field_code, grade, department, bio, faculty:faculties(name))";

/** 予約の締め切り（開始1時間前）を過ぎていない空き枠 */
export function bookableSince(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

export async function loadOpenSlots(supabase: SupabaseClient, teacherIds: string[]) {
  if (teacherIds.length === 0) return [] as Slot[];
  const { data } = await supabase
    .from("slots")
    .select("*")
    .in("teacher_id", teacherIds)
    .eq("status", "open")
    .gt("start_at", bookableSince())
    .order("start_at");
  return (data ?? []) as Slot[];
}
