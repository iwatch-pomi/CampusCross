"use server";

import { revalidatePath } from "next/cache";
import { friendlyDbError, requireOnboarded } from "@/lib/auth";
import { jstToIso } from "@/lib/format";
import { CONTACT_INFO_ERROR, hasContactInfo, PLACE_ORDER } from "@/lib/safety";
import type { ActionState, MeetingPlace } from "@/lib/types";

const ZOOM_URL = /^https:\/\/([a-z0-9-]+\.)*zoom\.us\/\S*$/i;
const CLOSED_ROOM = /(研究室|ラボ|lab|個室|自宅|実家|家で|部屋|寮|アパート|マンション|ホテル|カラオケ|車)/i;

export async function createSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireOnboarded();

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const minutes = formData.get("minutes") === "30" ? 30 : 15;
  const place = String(formData.get("place") ?? "") as MeetingPlace;
  const placeNote = String(formData.get("place_note") ?? "").trim() || null;
  const meetingUrl = String(formData.get("meeting_url") ?? "").trim();
  const repeat = Math.min(Math.max(Number(formData.get("repeat") ?? 1) || 1, 1), 8);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: "日付と開始時刻を入力してください" };
  }
  if (!PLACE_ORDER.includes(place)) return { error: "場所を選んでください" };
  if (place !== "zoom" && placeNote) {
    if (placeNote.length > 40) return { error: "目印は40文字以内にしてください" };
    if (CLOSED_ROOM.test(placeNote)) return { error: "目印に個室・研究室・自宅などは書けません（公共スペース内の目印だけにしてください）" };
    if (hasContactInfo(placeNote)) return { error: CONTACT_INFO_ERROR };
  }
  if (place === "zoom" && !ZOOM_URL.test(meetingUrl)) {
    return { error: "ZoomのURL（https://〜zoom.us/〜）を入力してください。予約した人にだけ表示されます" };
  }

  const start = new Date(jstToIso(date, time));
  if (start.getTime() <= Date.now()) return { error: "これから先の日時を選んでください" };

  // 「毎週くり返す」を選んだら、同じ曜日・時刻で最大8週分つくる
  const rows = Array.from({ length: repeat }, (_, i) => {
    const s = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    return {
      teacher_id: profile.id,
      start_at: s.toISOString(),
      end_at: new Date(s.getTime() + minutes * 60000).toISOString(),
      place,
      place_note: place === "zoom" ? null : placeNote,
    };
  });

  const { data: created, error } = await supabase.from("slots").insert(rows).select("id");
  if (error || !created) {
    if (error?.message.includes("slots_no_overlap")) {
      return { error: "すでに登録している枠と時間が重なっています" };
    }
    return { error: friendlyDbError(error, "枠を登録できませんでした") };
  }

  if (place === "zoom") {
    const { error: secretError } = await supabase
      .from("slot_secrets")
      .insert(created.map((s) => ({ slot_id: s.id, meeting_url: meetingUrl })));
    if (secretError) {
      await supabase.from("slots").delete().in("id", created.map((s) => s.id));
      return { error: friendlyDbError(secretError, "ZoomのURLを保存できませんでした") };
    }
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
