import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui";
import { DecorationCircles } from "@/components/decor/decoration-circles";
import { categoryMeta, TONE_CLASS } from "@/lib/categories";

type CollageItem = { title: string; field: string; seed: string; image?: string };

/** ヒーロー：左に大きなキャッチコピーとCTA、右にイラストのタイルのコラージュ */
export function HeroSection({
  eyebrow,
  title,
  sub,
  actions,
  trust,
  collage,
}: {
  eyebrow: string;
  title: readonly string[];
  sub: string;
  actions: ReactNode;
  trust: string[];
  collage: CollageItem[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-hero">
      <DecorationCircles preset="hero" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-16">
        <div>
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary shadow-card">
            <ShieldCheck className="size-4" aria-hidden />
            {eyebrow}
          </p>
          <h1 className="text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            {title.map((line, i) => (
              <span key={line} className={`block ${i === title.length - 1 ? "text-primary" : ""}`}>
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-lg text-base text-text-sub sm:text-lg">{sub}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-sub">
            {trust.map((t) => (
              <li key={t} className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary-vivid" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Collage items={collage} />
      </div>
    </section>
  );
}

/** 角丸のタイルを少しずらして重ねたコラージュ。image があれば写真に差し替わる */
function Collage({ items }: { items: CollageItem[] }) {
  const offsets = ["md:translate-y-6 -rotate-2", "md:-translate-y-4 rotate-2", "md:translate-y-2 rotate-1", "md:-translate-y-8 -rotate-1"];
  return (
    <ul aria-label="こんなテーマが並びます" className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
      {items.slice(0, 4).map((item, i) => {
        const { icon: Icon, tone } = categoryMeta(item.field);
        const c = TONE_CLASS[tone];
        return (
          <li key={item.seed} className={`relative ${offsets[i]}`}>
            <div className={`relative flex aspect-square flex-col sm:aspect-4/5 justify-between overflow-hidden rounded-lg p-4 shadow-card-hover ${c.bg}`}>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- 差し替え用の写真（任意）
                <img src={item.image} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <>
                  <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-surface/40" />
                  <Icon aria-hidden className={`relative size-10 sm:size-12 ${c.fg}`} strokeWidth={1.5} />
                </>
              )}
              <p className="relative rounded-md bg-surface/90 px-2.5 py-2 text-xs font-bold leading-snug sm:text-sm">{item.title}</p>
            </div>
            <span className="absolute -bottom-3 -right-2 rounded-full bg-surface p-1 shadow-card">
              <Avatar seed={item.seed} size="sm" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
