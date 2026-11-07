import Link from "next/link";
import { Badge } from "./ui";
import { GRADE_LABEL } from "@/lib/constants";
import { formatSlot } from "@/lib/format";
import type { OfferWithTeacher } from "@/lib/offers";
import type { Slot } from "@/lib/types";

export function OfferCard({
  offer,
  fieldLabel,
  cross,
  nextSlot,
  openCount,
}: {
  offer: OfferWithTeacher;
  fieldLabel: string;
  cross: boolean;
  nextSlot?: Slot;
  openCount: number;
}) {
  const t = offer.teacher;
  return (
    <Link
      href={`/offers/${offer.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {cross && <Badge tone="cross">異分野</Badge>}
        {offer.kind === "faculty_guide" && <Badge tone="guide">学部のしくみ</Badge>}
        <Badge>{fieldLabel}</Badge>
        <Badge tone="muted">{offer.duration_min}分</Badge>
      </div>
      <h2 className="text-base font-bold leading-snug text-stone-900">{offer.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm text-stone-600">{offer.hook}</p>
      {offer.tags.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-indigo-700">
          {offer.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </p>
      )}
      <div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-100 pt-3 text-xs">
        <p className="text-stone-600">
          <span className="font-semibold text-stone-800">{t.display_name}</span>
          {" ・ "}
          {t.faculty?.name ?? "学部未設定"}
          {t.grade && ` ${GRADE_LABEL[t.grade] ?? ""}`}
        </p>
        <p className={nextSlot ? "text-emerald-700" : "text-stone-400"}>
          {nextSlot ? `次の空き ${formatSlot(nextSlot.start_at, nextSlot.end_at).split(" ")[0]}（全${openCount}枠）` : "空き枠なし"}
        </p>
      </div>
    </Link>
  );
}
