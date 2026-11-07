import Link from "next/link";
import { CategoryIcon } from "./category-icon";

/** 白カード＋左に色付き角丸スクエアのアイコン＋右に分野名 */
export function CategoryCard({ code, label, sub, href }: { code: string; label: string; sub?: string; href?: string }) {
  const body = (
    <>
      <CategoryIcon field={code} shape="square" size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{label}</span>
        {sub && <span className="block truncate text-xs text-text-sub">{sub}</span>}
      </span>
    </>
  );
  const cls = "flex min-h-14 items-center gap-3 rounded-md border border-border bg-surface p-3 shadow-card";
  return href ? (
    <Link href={href} className={`${cls} transition-shadow hover:shadow-card-hover`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function CategoryCardGrid({ items }: { items: { code: string; label: string; sub?: string; href?: string }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {items.map((c) => (
        <li key={c.code}>
          <CategoryCard {...c} />
        </li>
      ))}
    </ul>
  );
}
