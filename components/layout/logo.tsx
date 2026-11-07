import Link from "next/link";
import { SITE } from "@/lib/content";

/** ロゴ（2本の線が交差するマーク＋サービス名） */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      prefetch={href === "/login" ? false : undefined}
      className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md font-bold tracking-tight"
      aria-label={`${SITE.name} トップへ`}
    >
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path d="M9 9l14 14" strokeWidth="3.5" strokeLinecap="round" className="stroke-on-primary" />
        <path d="M23 9L9 23" strokeWidth="3.5" strokeLinecap="round" className="stroke-accent-vivid" />
      </svg>
      <span className="text-base text-text sm:text-lg">
        Campus<span className="text-primary">-</span>Cross
      </span>
    </Link>
  );
}
