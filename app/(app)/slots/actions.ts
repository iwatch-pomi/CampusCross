"use server";

import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { jstToIso } from "@/lib/format";
import type { ActionState } from "@/lib/types";

export async function createSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireOnboarded();

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const minutes = formData.get("minutes") === "30" ? 30 : 15;
  const mode = formData.get("mode") === "online" ? "online" : "in_person";
  const location = String(formData.get("location") ?? "").trim();
  const repeat = Math.min(Math.max(Number(formData.get("repeat") ?? 1) || 1, 1), 8);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: "日付と開始時刻を入力してください" };
  }
  if (!location || location.length > 100) return { error: "場所を100文字以内で入力してください" };

  const start = new Date(jstToIso(date, time));
  if (start.getTime() <= Date.now()) return { error: "これから先の日時を選んでください" };

  // 「毎週くり返す」を選んだら、同じ曜日・時刻で最大8週分つくる
  const rows = Array.from({ length: repeat }, (_, i) => {
    const s = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    return {
      teacher_id: profile.id,
      start_at: s.toISOString(),
      end_at: new Date(s.getTime() + minutes * 60000).toISOString(),
      mode,
      location,
    };
  });

  const { error } = await supabase.from("slots").insert(rows);
  if (error) {
    if (error.message.includes("slots_no_overlap")) {
      return { error: "すでに登録している枠と時間が重なっています" };
    }
    return { error: "枠を登録できませんでした" };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: repeat > 1 ? `${repeat}週分の枠を登録しました` : "枠を登録しました" };
}

export async function cancelSlot(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireOnboarded();
  const id = String(formData.get("id") ?? "");
  await supabase.from("slots").update({ status: "cancelled" }).eq("id", id).eq("teacher_id", profile.id).eq("status", "open");
  revalidatePath("/", "layout");
}
