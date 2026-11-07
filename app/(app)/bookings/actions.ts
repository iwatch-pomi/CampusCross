"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOnboarded } from "@/lib/auth";
import { notify } from "@/lib/notify";
import type { ActionState } from "@/lib/types";

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

async function loadBooking(bookingId: string) {
  const member = await requireOnboarded();
  const { data: booking } = await member.supabase
    .from("bookings")
    .select("id, learner_id, teacher_id, offer:offers(title)")
    .eq("id", bookingId)
    .single();
  return { ...member, booking };
}

function offerTitle(booking: { offer: unknown }): string {
  const offer = booking.offer as { title: string } | { title: string }[] | null;
  return (Array.isArray(offer) ? offer[0]?.title : offer?.title) ?? "";
}

export async function cancelBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const reason = text(formData, "reason");
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: id, p_reason: reason });
  if (error) return { error: error.message };

  const other = booking.learner_id === profile.id ? booking.teacher_id : booking.learner_id;
  after(() =>
    notify({
      userId: other,
      subject: "予約がキャンセルされました",
      body: `${profile.display_name}さんが「${offerTitle(booking)}」の予約をキャンセルしました。${reason ? `\n理由: ${reason}` : ""}\nチケットは予約した人に戻っています。`,
      path: `/bookings/${id}`,
    }),
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "キャンセルしました。チケットは予約した人に戻りました" };
}

export async function completeBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const thanks = text(formData, "thanks");
  if ((thanks?.length ?? 0) > 300) return { error: "お礼コメントは300文字以内にしてください" };
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const { error } = await supabase.rpc("complete_booking", { p_booking_id: id, p_thanks: thanks });
  if (error) return { error: error.message };

  after(() =>
    notify({
      userId: booking.teacher_id,
      subject: thanks ? "お礼コメントが届きました" : "セッションが完了しました",
      body: `${profile.display_name}さんとの「${offerTitle(booking)}」が完了し、チケットを1枚受け取りました。${thanks ? `\n\nお礼コメント:\n${thanks}` : ""}`,
      path: "/me#teaching",
    }),
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "完了しました。チケット1枚が相手に届きました" };
}

export async function sendThanks(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const thanks = text(formData, "thanks");
  if (!thanks) return { error: "お礼コメントを入力してください" };
  if (thanks.length > 300) return { error: "お礼コメントは300文字以内にしてください" };
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const { error } = await supabase.rpc("send_thanks", { p_booking_id: id, p_thanks: thanks });
  if (error) return { error: error.message };

  after(() =>
    notify({
      userId: booking.teacher_id,
      subject: "お礼コメントが届きました",
      body: `${profile.display_name}さんから「${offerTitle(booking)}」のお礼コメントが届きました。\n\n${thanks}`,
      path: "/me#teaching",
    }),
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "お礼コメントを送りました" };
}

export async function reportUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const reason = String(formData.get("reason") ?? "other");
  const detail = text(formData, "detail");
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const target = booking.learner_id === profile.id ? booking.teacher_id : booking.learner_id;
  const { error } = await supabase.from("reports").insert({
    reporter_id: profile.id,
    target_user_id: target,
    booking_id: id,
    reason: ["solicitation", "harassment", "no_show", "other"].includes(reason) ? reason : "other",
    detail,
  });
  if (error) return { error: "通報を送れませんでした" };
  return { ok: true, message: "通報を受け付けました。運営が確認します" };
}

export async function blockUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const target = booking.learner_id === profile.id ? booking.teacher_id : booking.learner_id;
  const { error } = await supabase.from("blocks").insert({ blocker_id: profile.id, blocked_id: target });
  if (error && !error.message.includes("duplicate")) return { error: "ブロックできませんでした" };
  return { ok: true, message: "ブロックしました。今後この相手とは予約が成立しません" };
}
