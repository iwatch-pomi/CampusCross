import type { ReactNode } from "react";
import { TONE_CLASS, type CategoryTone } from "@/lib/categories";

export type BadgeTone = "neutral" | "primary" | "accent" | "point" | "success" | "warn" | "danger" | "muted";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-bg-section text-text",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  point: "bg-point-soft text-point",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  muted: "bg-surface text-text-sub ring-1 ring-border",
};

export function Badge({
  tone = "neutral",
  category,
  icon,
  children,
}: {
  tone?: BadgeTone;
  /** 指定するとカテゴリ色で表示する */
  category?: CategoryTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const color = category ? `${TONE_CLASS[category].bg} ${TONE_CLASS[category].fg}` : TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 ${color}`}>
      {icon}
      {children}
    </span>
  );
}
