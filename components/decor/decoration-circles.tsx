/** 背景に浮かぶ半透明の円。親要素に relative と overflow-hidden を付けて使う */
const PRESETS = {
  hero: [
    "-left-16 top-10 size-48 bg-primary-vivid/15",
    "right-1/12 -top-12 size-40 bg-accent-vivid/15",
    "-bottom-16 -right-12 size-64 bg-point-vivid/12",
    "left-2/5 bottom-8 size-16 bg-primary-vivid/20",
    "left-1/8 bottom-1/5 size-6 bg-accent-vivid/30",
  ],
  soft: [
    "-right-12 top-6 size-40 bg-primary-vivid/10",
    "-left-8 bottom-4 size-28 bg-point-vivid/10",
    "left-3/10 -top-4 size-10 bg-accent-vivid/20",
  ],
} as const;

export function DecorationCircles({ preset = "soft" }: { preset?: keyof typeof PRESETS }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
      {PRESETS[preset].map((cls) => (
        <span key={cls} className={`absolute rounded-full ${cls}`} />
      ))}
    </div>
  );
}
