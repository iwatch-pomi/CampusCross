import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { Avatar, ButtonLink } from "@/components/ui";
import { Logo } from "./logo";
import { shortFieldLabel } from "@/lib/categories";
import { SearchBar } from "./search-bar";

type FieldOption = { code: string; label: string };

/** ログイン後のヘッダー。1段目は追従、2段目は分野のメニュー列 */
export function AppHeader({
  fields,
  balance,
  user,
}: {
  fields: FieldOption[];
  balance: number;
  user: { id: string; name: string };
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Logo />
          <SearchBar fields={fields} className="mx-2 hidden max-w-xl md:flex" />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/me#tickets"
              aria-label={`チケット残高 ${balance}枚`}
              className="flex min-h-11 items-center gap-1 rounded-full bg-primary-soft px-3 text-sm font-bold text-primary"
            >
              <Ticket className="size-4" aria-hidden />
              {balance}
              <span className="text-xs">枚</span>
            </Link>
            <ButtonLink href="/offers/new" variant="accent" className="hidden lg:inline-flex">
              <Plus className="size-4" aria-hidden />
              カードを出す
            </ButtonLink>
            <Link href="/me" aria-label="マイページ" className="flex size-11 items-center justify-center rounded-full">
              <Avatar seed={user.id} name={user.name} size="sm" />
            </Link>
          </div>
        </div>
      </header>
      <CategoryMenuBar fields={fields} />
    </>
  );
}

/** ヘッダー直下の分野メニュー（横スクロール） */
export function CategoryMenuBar({ fields }: { fields: FieldOption[] }) {
  return (
    <nav aria-label="分野からさがす" className="border-b border-border bg-surface">
      <ul className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        <li>
          <Link href="/search?kind=faculty_guide" className="flex min-h-11 items-center whitespace-nowrap px-3 text-sm font-bold text-accent hover:bg-accent-soft">
            他学部のしくみ
          </Link>
        </li>
        {fields.map((f) => (
          <li key={f.code}>
            <Link href={`/search?field=${f.code}`} className="flex min-h-11 items-center whitespace-nowrap px-3 text-sm text-text-sub hover:bg-bg-section hover:text-text">
              {shortFieldLabel(f.label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
