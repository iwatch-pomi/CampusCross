import { hashSeed } from "@/lib/categories";

/*
 * イラストのアバター。写真を使わず、seed（ユーザーIDなど）から
 * 背景色・肌・髪型・髪色を決めて、毎回同じ見た目になるようにする。
 * 髪は「後ろ髪（顔の後ろ）」と「前髪（おでこの上）」に分けて描き、顔を隠さない。
 * Tailwind がクラスを拾えるよう、色ごとのクラスは静的に列挙する。
 */
const BG = ["fill-cat-1-bg", "fill-cat-2-bg", "fill-cat-3-bg", "fill-cat-4-bg", "fill-cat-5-bg", "fill-cat-6-bg", "fill-cat-7-bg", "fill-cat-9-bg"];
const SHIRT = ["fill-cat-1-fg", "fill-cat-2-fg", "fill-cat-3-fg", "fill-cat-4-fg", "fill-cat-5-fg", "fill-cat-6-fg", "fill-cat-7-fg", "fill-cat-9-fg"];
const SKIN = ["fill-skin-1", "fill-skin-2", "fill-skin-3"];
const HAIR = ["fill-hair-1", "fill-hair-2", "fill-hair-3", "fill-hair-4"];

// 顔は中心 (32,30) 半径13。前髪は目（y=31）より上にとどめる
const HAIR_STYLES: { back?: string; front: string }[] = [
  // ショート
  { front: "M18.5 29c0-8.5 6-15 13.5-15s13.5 6.5 13.5 15c-2.5-3.5-7.5-6-13.5-6s-11 2.5-13.5 6z" },
  // ボブ（後ろ髪あり）
  {
    back: "M16 31c0-10 7-18 16-18s16 8 16 18v11c0 2-1.5 3.5-3.5 3.5h-25c-2 0-3.5-1.5-3.5-3.5z",
    front: "M19 27c1.5-7 6.5-11.5 13-11.5s11.5 4.5 13 11.5c-4-2.5-8.5-3.5-13-3.5s-9 1-13 3.5z",
  },
  // 前髪ななめ
  { front: "M18.5 29c0-9 6-15.5 14-15.5 7 0 12.5 5 13 12-6.5-.5-12.5-3-16.5-6.5-2.5 4.5-6 8-10.5 10z" },
  // おだんご
  {
    back: "M32 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12z",
    front: "M19 28c.5-8 6-13.5 13-13.5s12.5 5.5 13 13.5c-3.5-3-8-4.5-13-4.5s-9.5 1.5-13 4.5z",
  },
];

const SIZE = { sm: "size-8", md: "size-11", lg: "size-16", xl: "size-24" } as const;

export function Avatar({
  seed,
  name,
  size = "md",
  className = "",
}: {
  seed: string;
  /** 読み上げ用。省略すると装飾扱いにする */
  name?: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const h = hashSeed(seed);
  const color = h % BG.length;
  const skin = SKIN[(h >>> 3) % SKIN.length];
  const hair = HAIR[(h >>> 5) % HAIR.length];
  const style = HAIR_STYLES[(h >>> 7) % HAIR_STYLES.length];

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${SIZE[size]} shrink-0 rounded-full ${className}`}
      role={name ? "img" : undefined}
      aria-label={name ? `${name}さんのアバター` : undefined}
      aria-hidden={name ? undefined : true}
    >
      <circle cx="32" cy="32" r="32" className={BG[color]} />
      {style.back && <path d={style.back} className={hair} />}
      <path d="M12 64c1-11 9-17 20-17s19 6 20 17z" className={SHIRT[color]} />
      <rect x="28" y="38" width="8" height="9" rx="3" className={skin} />
      <circle cx="32" cy="30" r="13" className={skin} />
      <path d={style.front} className={hair} />
      <circle cx="27" cy="32" r="1.6" className="fill-text" />
      <circle cx="37" cy="32" r="1.6" className="fill-text" />
      <circle cx="24.5" cy="35.5" r="1.8" className="fill-point-vivid" opacity="0.35" />
      <circle cx="39.5" cy="35.5" r="1.8" className="fill-point-vivid" opacity="0.35" />
      <path d="M28.5 37c2 1.8 5 1.8 7 0" fill="none" strokeWidth="1.6" strokeLinecap="round" className="stroke-text" />
    </svg>
  );
}
