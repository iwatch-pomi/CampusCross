import type { ReactNode } from "react";
import Link from "next/link";

/** ピル型のタブ切り替え（リンクで切り替えるのでサーバーだけで動く） */
export function CategoryTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { key: string; label: string; href: string; active: boolean; icon?: ReactNode }[];
}) {
  return (
    <nav aria-label={label} className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-sm font-bold text-text-sub hover:border-primary hover:text-primary aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-on-primary"
            >
              {t.icon}
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
