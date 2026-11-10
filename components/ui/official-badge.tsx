import { BadgeCheck } from "lucide-react";

/**
 * 公式運営バッジ。運営が付けた人（profiles.is_official）の名前の横に出す。
 * compact はカードの下部など狭い場所用（アイコン＋「運営」）。
 */
export function OfficialBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary" title="Campus-Cross 公式運営">
        <BadgeCheck className="size-4" aria-hidden />
        運営
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold leading-5 text-on-primary"
      title="Campus-Cross 公式運営"
    >
      <BadgeCheck className="size-3.5" aria-hidden />
      公式運営
    </span>
  );
}
