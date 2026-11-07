import { categoryMeta, TONE_CLASS } from "@/lib/categories";

/** 分野アイコン。shape で円形（グリッド用）／角丸スクエア（カード用）を切り替える */
export function CategoryIcon({
  field,
  shape = "circle",
  size = "md",
}: {
  field: string;
  shape?: "circle" | "square";
  size?: "sm" | "md" | "lg";
}) {
  const { icon: Icon, tone } = categoryMeta(field);
  const box = { sm: "size-9", md: "size-14", lg: "size-16" }[size];
  const glyph = { sm: "size-5", md: "size-7", lg: "size-8" }[size];
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center ${box} ${shape === "circle" ? "rounded-full" : "rounded-md"} ${TONE_CLASS[tone].bg} ${TONE_CLASS[tone].fg}`}
    >
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}
