import { Search } from "lucide-react";

/** 「分野の選択＋キーワード」一体型の検索バー（/search へ GET で送る） */
export function SearchBar({
  fields,
  defaultField = "",
  defaultQuery = "",
  className = "",
}: {
  fields: { code: string; label: string }[];
  defaultField?: string;
  defaultQuery?: string;
  className?: string;
}) {
  return (
    <form action="/search" role="search" className={`flex min-h-12 w-full items-stretch rounded-full border border-border-strong bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25 ${className}`}>
      <label className="sr-only" htmlFor="search-field">分野</label>
      <select
        id="search-field"
        name="field"
        defaultValue={defaultField}
        className="max-w-32 shrink-0 cursor-pointer rounded-l-full border-r border-border bg-transparent py-2 pl-4 pr-2 text-sm font-bold focus:outline-none"
      >
        <option value="">すべての分野</option>
        {fields.map((f) => (
          <option key={f.code} value={f.code}>{f.label}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="search-q">キーワード</label>
      <input
        id="search-q"
        name="q"
        defaultValue={defaultQuery}
        placeholder="キーワード（例：機械学習、ゼミ）"
        className="min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-text-sub/80 focus:outline-none"
      />
      <button type="submit" aria-label="検索する" className="m-0.5 flex size-11 shrink-0 items-center justify-center self-center rounded-full bg-primary text-on-primary hover:bg-primary-strong">
        <Search className="size-4" aria-hidden />
      </button>
    </form>
  );
}
