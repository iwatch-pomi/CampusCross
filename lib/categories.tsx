import {
  BookOpen,
  Brain,
  Cog,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Laptop,
  Palette,
  Puzzle,
  Scale,
  Sparkles,
  Sprout,
  type LucideIcon,
} from "lucide-react";

/** カテゴリ色の番号（tokens.css の --color-cat-N-*） */
export type CategoryTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** 分野コード → アイコンと色。分野マスタ（DB）に新しい分野が増えたら、ここにも足す */
const CATEGORY_META: Record<string, { icon: LucideIcon; tone: CategoryTone }> = {
  science: { icon: FlaskConical, tone: 4 },
  engineering: { icon: Cog, tone: 2 },
  informatics: { icon: Laptop, tone: 1 },
  life_science: { icon: Sprout, tone: 7 },
  medical: { icon: HeartPulse, tone: 8 },
  humanities: { icon: BookOpen, tone: 5 },
  social_science: { icon: Scale, tone: 9 },
  education: { icon: GraduationCap, tone: 6 },
  arts: { icon: Palette, tone: 3 },
  interdisciplinary: { icon: Puzzle, tone: 11 },
  other: { icon: Sparkles, tone: 10 },
};

const FALLBACK = { icon: Brain, tone: 12 as CategoryTone };

export function categoryMeta(fieldCode: string | null | undefined) {
  return (fieldCode && CATEGORY_META[fieldCode]) || FALLBACK;
}

/**
 * Tailwind はクラス名を静的に拾うので、色ごとのクラスを列挙しておく
 * （動的に `bg-cat-${n}-bg` と組み立てると CSS が生成されない）
 */
export const TONE_CLASS: Record<CategoryTone, { bg: string; fg: string; border: string }> = {
  1: { bg: "bg-cat-1-bg", fg: "text-cat-1-fg", border: "border-cat-1-fg/30" },
  2: { bg: "bg-cat-2-bg", fg: "text-cat-2-fg", border: "border-cat-2-fg/30" },
  3: { bg: "bg-cat-3-bg", fg: "text-cat-3-fg", border: "border-cat-3-fg/30" },
  4: { bg: "bg-cat-4-bg", fg: "text-cat-4-fg", border: "border-cat-4-fg/30" },
  5: { bg: "bg-cat-5-bg", fg: "text-cat-5-fg", border: "border-cat-5-fg/30" },
  6: { bg: "bg-cat-6-bg", fg: "text-cat-6-fg", border: "border-cat-6-fg/30" },
  7: { bg: "bg-cat-7-bg", fg: "text-cat-7-fg", border: "border-cat-7-fg/30" },
  8: { bg: "bg-cat-8-bg", fg: "text-cat-8-fg", border: "border-cat-8-fg/30" },
  9: { bg: "bg-cat-9-bg", fg: "text-cat-9-fg", border: "border-cat-9-fg/30" },
  10: { bg: "bg-cat-10-bg", fg: "text-cat-10-fg", border: "border-cat-10-fg/30" },
  11: { bg: "bg-cat-11-bg", fg: "text-cat-11-fg", border: "border-cat-11-fg/30" },
  12: { bg: "bg-cat-12-bg", fg: "text-cat-12-fg", border: "border-cat-12-fg/30" },
};

/** グリッドやバッジ用の短い分野名（括弧書きを省く。例: 社会科学（法・経済・経営）→ 社会科学） */
export function shortFieldLabel(label: string): string {
  return label.replace(/（.*?）|\(.*?\)/g, "").trim();
}

/** 文字列から安定した番号を作る（アバターの見た目などに使う） */
export function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}
