import { Quote } from "lucide-react";
import { Avatar } from "@/components/ui";

/** 口コミ・お礼コメント用のカード：白カード＋本文＋イラストのアバター＋属性 */
export function TestimonialCard({
  quote,
  name,
  attribute,
  seed,
  footnote,
}: {
  quote: string;
  name?: string;
  attribute: string;
  seed: string;
  footnote?: string;
}) {
  return (
    <figure className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
      <Quote className="size-6 text-primary-vivid" aria-hidden />
      <blockquote className="flex-1 text-sm leading-relaxed">{quote}</blockquote>
      <figcaption className="flex items-center gap-3 border-t border-border pt-4">
        <Avatar seed={seed} size="md" />
        <span className="text-xs">
          {name && <span className="block text-sm font-bold">{name}</span>}
          <span className="block text-text-sub">{attribute}</span>
          {footnote && <span className="block text-text-sub">{footnote}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
