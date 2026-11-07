"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "さがす" },
  { href: "/offers/new", label: "募集する" },
  { href: "/slots", label: "空き枠" },
  { href: "/me", label: "マイページ" },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (mobile) {
    return (
      <ul className="grid grid-cols-4">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`block py-3 text-center text-xs font-medium ${isActive(l.href) ? "text-indigo-700" : "text-stone-500"}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex gap-1">
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${isActive(l.href) ? "bg-indigo-50 text-indigo-700" : "text-stone-600 hover:bg-stone-100"}`}
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
