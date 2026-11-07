import { categoryMeta, TONE_CLASS } from "@/lib/categories";
import type { OfferKind } from "@/lib/types";

/**
 * カード上部のサムネイル。画像の代わりに、分野の色とアイコンでイラスト風に描く。
 * 将来画像を使う場合は image を渡すと差し替わる。
 */
export function SkillThumbnail({
  field,
  kind,
  durationMin,
  image,
  size = "card",
}: {
  field: string;
  kind: OfferKind;
  durationMin: number;
  image?: string;
  size?: "card" | "hero";
}) {
  const { icon: Icon, tone } = categoryMeta(field);
  const c = TONE_CLASS[tone];
  const height = size === "hero" ? "h-40 sm:h-56" : "h-28";

  return (
    <div className={`relative overflow-hidden ${height} ${c.bg}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 任意の差し替え画像（現状は未使用）
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <div aria-hidden className={`absolute inset-0 ${c.fg}`}>
          <span className="absolute -right-6 -top-8 size-28 rounded-full bg-surface/45" />
          <span className="absolute -bottom-10 left-6 size-24 rounded-full bg-surface/30" />
          <span className="absolute left-1/2 top-4 size-3 rounded-full bg-current opacity-20" />
          <Icon
            className={`absolute right-5 ${size === "hero" ? "bottom-6 size-24 sm:size-28" : "bottom-3 size-16"} opacity-90`}
            strokeWidth={1.4}
          />
        </div>
      )}
      <div className="absolute left-3 top-3 flex gap-1.5">
        <span className={`rounded-full bg-surface/90 px-2.5 py-0.5 text-xs font-bold ${kind === "faculty_guide" ? "text-accent" : c.fg}`}>
          {kind === "faculty_guide" ? "学部のしくみ" : "専門テーマ"}
        </span>
        <span className="rounded-full bg-surface/90 px-2.5 py-0.5 text-xs font-bold text-text">{durationMin}分</span>
      </div>
    </div>
  );
}
