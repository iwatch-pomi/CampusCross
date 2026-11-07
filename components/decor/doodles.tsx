/** 手描き風の小さな装飾（星・音符・きらきら・ぐるぐる）。親に relative を付けて使う */
const DOODLES = {
  star: "M12 3.5c.6 2.6 1.4 4.6 2.6 5.6 1.3 1 3.4 1.4 5.9 1.7-2.4.8-4.3 1.6-5.2 2.9-.9 1.3-1.1 3.4-1.1 6-1-2.4-2-4.3-3.3-5.2-1.4-.9-3.4-1.2-6-1.3 2.4-.9 4.3-1.9 5.2-3.3.9-1.3 1.4-3.6 1.9-6.4z",
  note: "M9 18.5a2.6 2.3 0 1 1-1.2-2.1V5.2c3.5-.6 7-1.5 9.8-2.5v11.6a2.6 2.3 0 1 1-1.2-2.1V6.4c-2.4.7-4.9 1.3-7.4 1.7",
  sparkle: "M12 2v5M12 17v5M2 12h5M17 12h5M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M18.5 5.5l-2.8 2.8M8.3 15.7l-2.8 2.8",
  squiggle: "M2 14c2.5-5 5-5 7.5 0s5 5 7.5 0 3.5-4.5 5-2",
} as const;

type Item = { kind: keyof typeof DOODLES; className: string };

const PRESET: Item[] = [
  { kind: "star", className: "left-1/16 top-4 size-7 text-accent-vivid" },
  { kind: "note", className: "right-1/12 top-8 size-7 text-primary-vivid" },
  { kind: "sparkle", className: "left-1/7 bottom-6 size-6 text-point-vivid" },
  { kind: "squiggle", className: "right-1/6 bottom-4 size-9 text-accent-vivid" },
];

export function DoodleDecorations({ items = PRESET }: { items?: Item[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {items.map((d) => (
        <svg
          key={`${d.kind}-${d.className}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute ${d.className}`}
        >
          <path d={DOODLES[d.kind]} />
        </svg>
      ))}
    </div>
  );
}
