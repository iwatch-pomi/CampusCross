import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CategoryItem } from "./category-icon-grid";
import { shortFieldLabel } from "@/lib/categories";

/** PC 用：左サイドバーのカテゴリ一覧 */
export function CategorySidebar({ title, items, activeCode }: { title: string; items: CategoryItem[]; activeCode?: string }) {
  return (
    <nav aria-label={title} className="rounded-lg border border-border bg-surface p-2 shadow-card">
      <p className="px-3 pb-1 pt-2 text-xs font-bold text-text-sub">{title}</p>
      <ul>
        {items.map((c) => (
          <li key={c.code}>
            <Link
              href={c.href}
              aria-current={activeCode === c.code ? "page" : undefined}
              className="flex min-h-11 items-center justify-between rounded-md px-3 text-sm hover:bg-bg-section aria-[current=page]:bg-primary-soft aria-[current=page]:font-bold aria-[current=page]:text-primary"
            >
              <span>{shortFieldLabel(c.label)}</span>
              <span className="flex items-center gap-1 text-text-sub">
                {typeof c.count === "number" && <span className="text-xs">{c.count}</span>}
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
