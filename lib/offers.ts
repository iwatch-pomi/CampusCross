import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCrossField } from "./auth";
import { GRADE_LABEL } from "./constants";
import { shortFieldLabel } from "./categories";
import { formatSlot, minutesBetween } from "./format";
import type { Offer, OfferKind, Profile, PublicProfile, Slot } from "./types";
import type { SkillCardData } from "@/components/skill/skill-card";

export type OfferWithTeacher = Offer & { teacher: PublicProfile };

export const TEACHER_SELECT =
  "teacher:profiles!offers_teacher_id_fkey(id, display_name, faculty_id, field_code, grade, bio, same_gender_only, is_official, faculty:faculties(name))";

/** 自分が申し込める相手（同性限定・ブロック・停止を DB 側で判定）。性別そのものは返ってこない */
export async function bookableTeacherIds(supabase: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase.rpc("bookable_teachers", { p_ids: ids });
  return new Set(((data ?? []) as unknown[]).map((row) => (typeof row === "string" ? row : (row as { bookable_teachers: string }).bookable_teachers)));
}

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

export type SearchParams = {
  kind?: OfferKind | "";
  field?: string;
  faculty?: string;
  mode?: "in_person" | "online" | "";
  duration?: "15" | "30" | "";
  open?: boolean;
  q?: string;
  sort?: "recommended" | "soon" | "new";
};

export type OfferRow = {
  offer: OfferWithTeacher;
  cross: boolean;
  open: Slot[];
  /** 自分が出したカード（予約はできないが、一覧と件数には含める） */
  mine: boolean;
  card: SkillCardData;
};

/**
 * 公開中のカードを、空き枠・異分野判定つきで取得して絞り込む。
 * Phase 1 は件数が少ない（数百件まで）想定なので、絞り込みと並べ替えはサーバー側のメモリで行う。
 */
export async function searchOffers(
  supabase: SupabaseClient,
  me: Profile,
  fieldLabel: Record<string, string>,
  params: SearchParams = {},
): Promise<OfferRow[]> {
  let query = supabase
    .from("offers")
    .select(`*, ${TEACHER_SELECT}`)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(300);
  if (params.kind) query = query.eq("kind", params.kind);
  if (params.field) query = query.eq("field_code", params.field);
  if (params.duration) query = query.eq("duration_min", Number(params.duration));

  const { data } = await query;
  const needle = params.q?.trim().toLowerCase() ?? "";
  const all = (data ?? []) as OfferWithTeacher[];
  // 同性限定などで申し込めない相手のカードは、一覧に出さない
  const others = [...new Set(all.map((o) => o.teacher_id))].filter((id) => id !== me.id);
  const allowed = await bookableTeacherIds(supabase, others);
  const offers = all.filter((o) => {
    if (o.teacher_id !== me.id && !allowed.has(o.teacher_id)) return false;
    if (params.faculty && o.teacher.faculty_id !== params.faculty) return false;
    if (needle) {
      const hay = [o.title, o.hook, o.description ?? "", o.want_to_hear ?? "", ...o.tags].join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const slots = await loadOpenSlots(supabase, [...new Set(offers.map((o) => o.teacher_id))]);
  const byTeacher = new Map<string, Slot[]>();
  for (const s of slots) byTeacher.set(s.teacher_id, [...(byTeacher.get(s.teacher_id) ?? []), s]);

  let rows = offers.map((o) => {
    const open = (byTeacher.get(o.teacher_id) ?? []).filter((s) => minutesBetween(s.start_at, s.end_at) >= o.duration_min);
    const mine = o.teacher_id === me.id;
    const cross = !mine && isCrossField(me, o.teacher);
    return { offer: o, cross, open, mine, card: { ...toCard(o, cross, open, fieldLabel), mine } };
  });

  if (params.mode) rows = rows.filter((r) => r.open.some((s) => s.mode === params.mode));
  if (params.open) rows = rows.filter((r) => r.open.length > 0);

  const nextAt = (r: OfferRow) => (r.open[0] ? new Date(r.open[0].start_at).getTime() : Infinity);
  if (params.sort === "soon") rows.sort((a, b) => nextAt(a) - nextAt(b));
  else if (params.sort !== "new") {
    // おすすめ: 他の人のカード → 異分野 → 空き枠あり → 新しい順
    rows.sort(
      (a, b) =>
        Number(a.mine) - Number(b.mine) ||
        Number(b.cross) - Number(a.cross) ||
        Number(b.open.length > 0) - Number(a.open.length > 0),
    );
  }
  return rows;
}

export function toCard(o: OfferWithTeacher, cross: boolean, open: Slot[], fieldLabel: Record<string, string>): SkillCardData {
  return {
    id: o.id,
    kind: o.kind,
    title: o.title,
    hook: o.hook,
    fieldCode: o.field_code,
    fieldLabel: shortFieldLabel(fieldLabel[o.field_code] ?? o.field_code),
    durationMin: o.duration_min,
    teacher: {
      id: o.teacher.id,
      name: o.teacher.display_name,
      faculty: o.teacher.faculty?.name,
      grade: o.teacher.grade ? GRADE_LABEL[o.teacher.grade] : null,
      official: o.teacher.is_official,
    },
    cross,
    sameGenderOnly: o.teacher.same_gender_only,
    nextSlotLabel: open[0] ? formatSlot(open[0].start_at, open[0].end_at).split("〜")[0] : null,
    tags: o.tags,
  };
}
