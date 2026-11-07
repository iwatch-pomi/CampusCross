import Link from "next/link";
import { requireOnboarded, isCrossField } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { loadOpenSlots, TEACHER_SELECT, type OfferWithTeacher } from "@/lib/offers";
import { OfferCard } from "@/components/offer-card";
import { BUTTON, Empty, INPUT } from "@/components/ui";
import type { OfferKind } from "@/lib/types";

const TABS: { kind: OfferKind; label: string; sub: string }[] = [
  { kind: "topic", label: "専門テーマ", sub: "他学部の人の研究・専門を15分で" },
  { kind: "faculty_guide", label: "他学部のしくみ", sub: "ゼミ・研究室の決まり方、卒論、学び方など" },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const kind: OfferKind = sp.kind === "faculty_guide" ? "faculty_guide" : "topic";
  const field = typeof sp.field === "string" ? sp.field : "";
  const faculty = typeof sp.faculty === "string" ? sp.faculty : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const { supabase, profile } = await requireOnboarded();
  const [{ fields, faculties, fieldLabel }, { data }] = await Promise.all([
    loadMasters(supabase),
    supabase
      .from("offers")
      .select(`*, ${TEACHER_SELECT}`)
      .eq("is_active", true)
      .eq("kind", kind)
      .neq("teacher_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const needle = q.toLowerCase();
  const offers = ((data ?? []) as OfferWithTeacher[]).filter((o) => {
    if (field && o.field_code !== field) return false;
    if (faculty && o.teacher.faculty_id !== faculty) return false;
    if (needle) {
      const hay = [o.title, o.hook, o.description ?? "", o.want_to_hear ?? "", ...o.tags].join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const slots = await loadOpenSlots(supabase, [...new Set(offers.map((o) => o.teacher_id))]);
  const slotsByTeacher = new Map<string, typeof slots>();
  for (const s of slots) {
    slotsByTeacher.set(s.teacher_id, [...(slotsByTeacher.get(s.teacher_id) ?? []), s]);
  }

  // 異分野を先に、その中で空き枠があるものを先に
  const rows = offers
    .map((o) => {
      const open = (slotsByTeacher.get(o.teacher_id) ?? []).filter(
        (s) => new Date(s.end_at).getTime() - new Date(s.start_at).getTime() >= o.duration_min * 60000,
      );
      return { offer: o, cross: isCrossField(profile, o.teacher), open };
    })
    .sort((a, b) => Number(b.cross) - Number(a.cross) || Number(b.open.length > 0) - Number(a.open.length > 0));

  const tab = TABS.find((t) => t.kind === kind)!;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-200/70 p-1" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            role="tab"
            aria-selected={t.kind === kind}
            href={t.kind === "topic" ? "/" : "/?kind=faculty_guide"}
            className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${t.kind === kind ? "bg-white text-indigo-700 shadow-sm" : "text-stone-600"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <p className="-mt-2 text-center text-xs text-stone-500">{tab.sub}</p>

      <form className="grid grid-cols-2 gap-2" action="/">
        {kind === "faculty_guide" && <input type="hidden" name="kind" value="faculty_guide" />}
        <select name="field" defaultValue={field} aria-label="分野で絞り込む" className={`${INPUT} py-2 text-sm`}>
          <option value="">すべての分野</option>
          {fields.map((f) => (
            <option key={f.code} value={f.code}>{f.label}</option>
          ))}
        </select>
        <select name="faculty" defaultValue={faculty} aria-label="学部で絞り込む" className={`${INPUT} py-2 text-sm`}>
          <option value="">すべての学部</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <div className="col-span-2 flex gap-2">
          <input name="q" defaultValue={q} placeholder="キーワード（例：機械学習、ゼミ）" aria-label="キーワード" className={`${INPUT} py-2 text-sm`} />
          <button type="submit" className={`${BUTTON.secondary} shrink-0 py-2`}>絞り込む</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty>
          {field || faculty || q ? "条件に合うカードがありません。" : "まだカードがありません。"}
          <br />
          <Link href="/offers/new" className="mt-2 inline-block font-semibold text-indigo-700 underline">
            最初のカードを出してみる
          </Link>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ offer, cross, open }) => (
            <li key={offer.id}>
              <OfferCard
                offer={offer}
                fieldLabel={fieldLabel[offer.field_code] ?? offer.field_code}
                cross={cross}
                nextSlot={open[0]}
                openCount={open.length}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
