import Link from "next/link";
import { CalendarClock, ShieldCheck, Shuffle, Ticket } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { categoryMeta } from "@/lib/categories";
import { SkillThumbnail } from "./skill-thumbnail";
import type { OfferKind } from "@/lib/types";

export type SkillCardData = {
  id: string;
  kind: OfferKind;
  title: string;
  hook?: string;
  fieldCode: string;
  fieldLabel: string;
  durationMin: number;
  /** 1回あたりのチケット枚数（構想では常に1枚） */
  tickets?: number;
  teacher: { id: string; name: string; faculty?: string | null; grade?: string | null };
  cross?: boolean;
  /** 話す人が「同性からの申し込みのみ」にしている */
  sameGenderOnly?: boolean;
  nextSlotLabel?: string | null;
  tags?: string[];
  /** 自分が出したカード */
  mine?: boolean;
};

/**
 * チケット型のスキルカード。
 * 上：サムネイル、中：タイトル（2行省略）、点線の切り取り線と左右の半円の切り欠き、下：話す人とチケット枚数。
 */
export function SkillCard({ data, className = "" }: { data: SkillCardData; className?: string }) {
  const { tone } = categoryMeta(data.fieldCode);
  return (
    <Link
      href={`/offers/${data.id}`}
      className={`group block h-full drop-shadow-card transition duration-150 hover:-translate-y-0.5 hover:drop-shadow-card-hover ${className}`}
    >
      <article
        className="ticket-notch flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface"
        style={{ ["--notch-y" as string]: "calc(100% - 4.5rem)" }}
      >
        <SkillThumbnail field={data.fieldCode} kind={data.kind} durationMin={data.durationMin} />
        <div className="flex flex-1 flex-col gap-2 px-4 pb-3 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {data.mine && <Badge tone="primary">あなたのカード</Badge>}
            {data.cross && (
              <Badge tone="point" icon={<Shuffle className="size-3" aria-hidden />}>
                異分野
              </Badge>
            )}
            <Badge category={tone}>{data.fieldLabel}</Badge>
            {data.sameGenderOnly && (
              <Badge tone="primary" icon={<ShieldCheck className="size-3" aria-hidden />}>
                同性のみ
              </Badge>
            )}
          </div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug group-hover:text-primary">{data.title}</h3>
          {data.hook && <p className="line-clamp-1 text-sm text-text-sub">{data.hook}</p>}
          <p className={`mt-auto flex items-center gap-1 text-xs ${data.nextSlotLabel ? "font-bold text-success" : "text-text-sub"}`}>
            <CalendarClock className="size-3.5" aria-hidden />
            {data.nextSlotLabel ? `次の空き ${data.nextSlotLabel}` : "いまは空き枠なし"}
          </p>
        </div>
        {/* 切り取り線（ここに左右の切り欠きが来る） */}
        <div className="flex h-18 items-center justify-between gap-2 border-t-2 border-dashed border-border px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar seed={data.teacher.id} size="sm" />
            <p className="min-w-0 text-xs leading-tight">
              <span className="block truncate font-bold">{data.teacher.name}</span>
              <span className="block truncate text-text-sub">
                {[data.teacher.faculty, data.teacher.grade].filter(Boolean).join(" ")}
              </span>
            </p>
          </div>
          <p className="flex shrink-0 items-baseline gap-0.5 text-primary">
            <Ticket className="size-4 self-center" aria-hidden />
            <span className="text-lg font-bold">{data.tickets ?? 1}</span>
            <span className="text-xs font-bold">枚</span>
            <span className="text-xs text-text-sub">/ {data.durationMin}分</span>
          </p>
        </div>
      </article>
    </Link>
  );
}
