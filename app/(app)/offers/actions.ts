"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOnboarded } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { formatSlot } from "@/lib/format";
import type { ActionState } from "@/lib/types";

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

function parseOffer(formData: FormData) {
  const tags = String(formData.get("tags") ?? "")
    .split(/[,、，\s]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
  return {
    kind: formData.get("kind") === "faculty_guide" ? "faculty_guide" : "topic",
    title: text(formData, "title") ?? "",
    hook: text(formData, "hook") ?? "",
    description: text(formData, "description"),
    want_to_hear: text(formData, "want_to_hear"),
    field_code: text(formData, "field_code") ?? "",
    tags,
    duration_min: formData.get("duration_min") === "30" ? 30 : 15,
  };
}

function validate(o: ReturnType<typeof parseOffer>): string | null {
  if (o.title.length < 5 || o.title.length > 60) return "タイトルは5〜60文字にしてください";
  if (!o.hook || o.hook.length > 140) return "「専門外の人へのひとこと」は1〜140文字で入力してください";
  if (!o.field_code) return "分野を選んでください";
  if ((o.description?.length ?? 0) > 1000) return "説明は1000文字以内にしてください";
  if ((o.want_to_hear?.length ?? 0) > 140) return "「あなたの分野から聞きたいこと」は140文字以内にしてください";
  return null;
}

export async function createOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireOnboarded();
  const offer = parseOffer(formData);
  const invalid = validate(offer);
  if (invalid) return { error: invalid };

  const { data, error } = await supabase
    .from("offers")
    .insert({ ...offer, teacher_id: profile.id })
    .select("id")
    .single();
  if (error || !data) return { error: "カードを作成できませんでした" };

  revalidatePath("/");
  redirect(`/offers/${data.id}?created=1`);
}

export async function updateOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireOnboarded();
  const id = String(formData.get("id") ?? "");
  const offer = parseOffer(formData);
  const invalid = validate(offer);
  if (invalid) return { error: invalid };

  const { error, count } = await supabase
    .from("offers")
    .update({ ...offer, is_active: formData.get("is_active") === "on" }, { count: "exact" })
    .eq("id", id)
    .eq("teacher_id", profile.id);
  if (error || count === 0) return { error: "カードを更新できませんでした" };

  revalidatePath("/", "layout");
  redirect(`/offers/${id}`);
}

export async function bookSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireOnboarded();
  const offerId = String(formData.get("offer_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const message = text(formData, "message");
  if (!slotId) return { error: "日時を選んでください" };
  if ((message?.length ?? 0) > 300) return { error: "ひとことは300文字以内にしてください" };

  const { data: bookingId, error } = await supabase.rpc("book_slot", {
    p_slot_id: slotId,
    p_offer_id: offerId,
    p_message: message,
  });
  if (error || !bookingId) return { error: error?.message ?? "予約できませんでした" };

  const [{ data: offer }, { data: slot }] = await Promise.all([
    supabase.from("offers").select("title, teacher_id").eq("id", offerId).single(),
    supabase.from("slots").select("start_at, end_at, location").eq("id", slotId).single(),
  ]);
  if (offer && slot) {
    after(() =>
      notify({
        userId: offer.teacher_id,
        subject: "予約が入りました",
        body: `${profile.display_name}さんが「${offer.title}」を予約しました。\n日時: ${formatSlot(slot.start_at, slot.end_at)}\n場所: ${slot.location}${message ? `\n\nひとこと: ${message}` : ""}`,
        path: `/bookings/${bookingId}`,
      }),
    );
  }

  revalidatePath("/", "layout");
  redirect(`/bookings/${bookingId}?booked=1`);
}
