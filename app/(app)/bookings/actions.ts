"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { friendlyDbError, requireOnboarded } from "@/lib/auth";
import { CONTACT_INFO_ERROR, hasContactInfo, REPORT_REASONS } from "@/lib/safety";
import { notify } from "@/lib/notify";
import { formatSlot, jstToIso } from "@/lib/format";
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
  if (hasContactInfo(reason)) return { error: CONTACT_INFO_ERROR };
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: id, p_reason: reason });
  if (error) return { error: friendlyDbError(error, "キャンセルできませんでした") };

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
  if (hasContactInfo(thanks)) return { error: CONTACT_INFO_ERROR };
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const { error } = await supabase.rpc("complete_booking", { p_booking_id: id, p_thanks: thanks });
  if (error) return { error: friendlyDbError(error, "完了にできませんでした") };

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
  if (hasContactInfo(thanks)) return { error: CONTACT_INFO_ERROR };
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };

  const { error } = await supabase.rpc("send_thanks", { p_booking_id: id, p_thanks: thanks });
  if (error) return { error: friendlyDbError(error, "お礼コメントを送れませんでした") };

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
    reason: REPORT_REASONS.some((r) => r.code === reason) ? reason : "other",
    detail,
  });
  if (error) return { error: "通報を送れませんでした" };
  return { ok: true, message: "通報を受け付けました。運営が確認し、不適切な行為が確認された場合は相手を永久に利用停止にします" };
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

export async function submitSafetyReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const feeling = String(formData.get("feeling") ?? "");
  const flags = formData.getAll("flags").map(String);
  const comment = text(formData, "comment");
  if (!["safe", "uneasy", "problem"].includes(feeling)) return { error: "どうだったかを選んでください" };
  if ((comment?.length ?? 0) > 1000) return { error: "コメントは1000文字以内にしてください" };

  const { supabase } = await requireOnboarded();
  const { error } = await supabase.rpc("submit_safety_review", {
    p_booking_id: id,
    p_feeling: feeling,
    p_flags: flags,
    p_comment: comment,
  });
  if (error) return { error: friendlyDbError(error, "安全レビューを送れませんでした") };

  // ここでは再描画しない（送信後の案内を画面に残すため。他の画面は次の遷移で最新になる）
  const serious = feeling === "problem" || flags.some((f) => ["dating", "contact_pushing", "solicitation", "harassment", "place_change"].includes(f));
  return {
    ok: true,
    message: serious
      ? "回答ありがとうございます。運営が確認します。必要なら下の「困ったことがあったら」からブロックもできます"
      : "回答ありがとうございます。相手には表示されません",
  };
}

/** 話す人が延期を提案する（自分の空き枠、または新しい日時を合わせて1〜3つ） */
export async function proposeReschedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const message = text(formData, "message");
  if ((message?.length ?? 0) > 300) return { error: "ひとことは300文字以内にしてください" };
  if (hasContactInfo(message)) return { error: CONTACT_INFO_ERROR };

  const slotIds = formData.getAll("slot_ids").map(String).filter(Boolean);
  const dates = formData.getAll("date").map(String);
  const times = formData.getAll("time").map(String);
  const starts: string[] = [];
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i]?.trim();
    const t = times[i]?.trim();
    if (!d && !t) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? "") || !/^\d{2}:\d{2}$/.test(t ?? "")) return { error: "新しい日時は、日付と時刻の両方を入力してください" };
    starts.push(jstToIso(d, t));
  }
  const total = slotIds.length + starts.length;
  if (total === 0) return { error: "候補を1つ以上選ぶか、新しい日時を入力してください" };
  if (total > 3) return { error: "候補は3つまでにしてください" };

  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };
  const { error } = await supabase.rpc("propose_reschedule", {
    p_booking_id: id,
    p_slot_ids: slotIds,
    p_starts: starts,
    p_message: message,
  });
  if (error) return { error: friendlyDbError(error, "延期を提案できませんでした") };

  after(() =>
    notify({
      userId: booking.learner_id,
      subject: "延期の提案が届きました",
      body: `${profile.display_name}さんから「${offerTitle(booking)}」の延期の提案が届きました。${message ? `\n\nひとこと: ${message}` : ""}\n\n予約の画面で、候補の日時から選ぶか、予約を取り消すかを選んでください。元の日時までに返事がない場合は、自動で取り消してチケットを戻します。`,
      path: `/bookings/${id}`,
    }),
  );
  revalidatePath("/", "layout");
  redirect(`/bookings/${id}?proposed=1`);
}

/** 予約した人が、延期の候補から1つ選ぶ */
export async function acceptReschedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const proposalId = String(formData.get("proposal_id") ?? "");
  const optionId = String(formData.get("option_id") ?? "");
  if (!optionId) return { error: "日時を選んでください" };

  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };
  const { error } = await supabase.rpc("accept_reschedule", { p_proposal_id: proposalId, p_option_id: optionId });
  if (error) return { error: friendlyDbError(error, "日時を変更できませんでした") };

  const { data: opt } = await supabase.from("reschedule_options").select("start_at, end_at").eq("id", optionId).single();
  after(() =>
    notify({
      userId: booking.teacher_id,
      subject: "延期の日時が決まりました",
      body: `${profile.display_name}さんが「${offerTitle(booking)}」の新しい日時を選びました。${opt ? `\n新しい日時: ${formatSlot(opt.start_at, opt.end_at)}` : ""}`,
      path: `/bookings/${id}`,
    }),
  );
  revalidatePath("/", "layout");
  redirect(`/bookings/${id}?rescheduled=1`);
}

/** 予約した人が、どの候補も合わないと返事する（予約は取り消し、チケットは戻る） */
export async function declineReschedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("booking_id") ?? "");
  const proposalId = String(formData.get("proposal_id") ?? "");
  const { supabase, profile, booking } = await loadBooking(id);
  if (!booking) return { error: "予約が見つかりません" };
  const { error } = await supabase.rpc("decline_reschedule", { p_proposal_id: proposalId });
  if (error) return { error: friendlyDbError(error, "返事を送れませんでした") };

  after(() =>
    notify({
      userId: booking.teacher_id,
      subject: "延期の候補が合わず、予約が取り消されました",
      body: `${profile.display_name}さんから、「${offerTitle(booking)}」の延期の候補はどれも都合が合わないと返事がありました。予約は取り消され、チケットは相手に戻りました。`,
      path: `/bookings/${id}`,
    }),
  );
  revalidatePath("/", "layout");
  redirect(`/bookings/${id}`);
}
