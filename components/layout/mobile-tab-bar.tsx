"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, House, Plus, Search, UserRound } from "lucide-react";

const TABS = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/search", label: "さがす", icon: Search },
  { href: "/offers/new", label: "カードを出す", icon: Plus },
  { href: "/slots", label: "空き枠", icon: CalendarClock },
  { href: "/me", label: "マイページ", icon: UserRound },
];

/** SP の下部タブバー（ログイン後） */
export function MobileTabBar() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav aria-label="メインメニュー" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-float backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-text-sub aria-[current=page]:text-primary"
            >
              {href === "/offers/new" ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-accent text-on-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
              ) : (
                <Icon className="size-5" aria-hidden />
              )}
              <span className="text-2xs font-bold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
