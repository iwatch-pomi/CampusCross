import Link from "next/link";
import { CategoryIcon } from "./category-icon";
import { shortFieldLabel } from "@/lib/categories";

export type CategoryItem = { code: string; label: string; count?: number; href: string };

/** 円形アイコン＋2行ラベルのグリッド（SP 4列 / PC 6列） */
export function CategoryIconGrid({ items }: { items: CategoryItem[] }) {
  return (
    <ul className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6">
      {items.map((c) => (
        <li key={c.code}>
          <Link href={c.href} className="group flex flex-col items-center gap-2 rounded-md p-1 text-center">
            <span className="transition-transform duration-150 group-hover:-translate-y-0.5">
              <CategoryIcon field={c.code} />
            </span>
            <span className="text-xs leading-snug sm:text-sm">
              <span className="line-clamp-2 font-bold">{shortFieldLabel(c.label)}</span>
              {typeof c.count === "number" && <span className="block text-text-sub">{c.count}件</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
