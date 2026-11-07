import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { searchOffers, type SearchParams } from "@/lib/offers";
import { buttonClass, EmptyState, INPUT } from "@/components/ui";
import { SkillCard } from "@/components/skill/skill-card";
import { SearchBar } from "@/components/layout/search-bar";
import { CategoryTabs } from "@/components/category/category-tabs";
import { FilterDrawer } from "@/components/search/filter-drawer";
import { AutoSubmitSelect } from "@/components/search/auto-submit-select";

export const metadata: Metadata = { title: "さがす" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const params: SearchParams = {
    kind: one(sp.kind) === "topic" || one(sp.kind) === "faculty_guide" ? (one(sp.kind) as SearchParams["kind"]) : "",
    field: one(sp.field),
    faculty: one(sp.faculty),
    mode: one(sp.mode) === "in_person" || one(sp.mode) === "online" ? (one(sp.mode) as SearchParams["mode"]) : "",
    duration: one(sp.duration) === "15" || one(sp.duration) === "30" ? (one(sp.duration) as SearchParams["duration"]) : "",
    open: one(sp.open) === "1",
    q: one(sp.q),
    sort: one(sp.sort) === "soon" || one(sp.sort) === "new" ? (one(sp.sort) as SearchParams["sort"]) : "recommended",
  };

  const { supabase, profile } = await requireOnboarded();
  const { fields, faculties, fieldLabel } = await loadMasters(supabase);
  const rows = await searchOffers(supabase, profile, fieldLabel, params);

  const activeCount = [params.field, params.faculty, params.mode, params.duration, params.open ? "1" : ""].filter(Boolean).length;
  const tabHref = (kind: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, kind, open: params.open ? "1" : "" })) if (v && v !== "recommended") q.set(k, String(v));
    const s = q.toString();
    return s ? `/search?${s}` : "/search";
  };

  const clearQuery = new URLSearchParams(
    Object.entries({ kind: params.kind ?? "", q: params.q ?? "", sort: params.sort === "recommended" ? "" : params.sort ?? "" }).filter(([, v]) => v),
  ).toString();
  const clearHref = clearQuery ? `/search?${clearQuery}` : "/search";

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <h1 className="text-2xl">さがす</h1>
        <SearchBar fields={fields} defaultField={params.field} defaultQuery={params.q} className="md:hidden" />
        <CategoryTabs
          label="カードの種類"
          tabs={[
            { key: "", label: "すべて", href: tabHref(""), active: !params.kind },
            { key: "topic", label: "専門テーマ", href: tabHref("topic"), active: params.kind === "topic" },
            { key: "faculty_guide", label: "他学部のしくみ", href: tabHref("faculty_guide"), active: params.kind === "faculty_guide" },
          ]}
        />
      </div>

      <form action="/search" className="grid gap-6 lg:grid-cols-[--spacing(72)_1fr]">
        {params.kind && <input type="hidden" name="kind" value={params.kind} />}
        {params.q && <input type="hidden" name="q" value={params.q} />}

        <div className="lg:order-none">
          <FilterDrawer activeCount={activeCount}>
            <div className="space-y-5 rounded-lg lg:border lg:border-border lg:bg-surface lg:p-5 lg:shadow-card">
              <FilterGroup label="分野" htmlFor="f-field">
                <select id="f-field" name="field" defaultValue={params.field} className={INPUT}>
                  <option value="">すべて</option>
                  {fields.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="話す人の学部" htmlFor="f-faculty">
                <select id="f-faculty" name="faculty" defaultValue={params.faculty} className={INPUT}>
                  <option value="">すべて</option>
                  {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </FilterGroup>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">形式</legend>
                <Radios name="mode" value={params.mode ?? ""} options={[["", "指定なし"], ["in_person", "対面"], ["online", "オンライン"]]} />
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">時間</legend>
                <Radios name="duration" value={params.duration ?? ""} options={[["", "指定なし"], ["15", "15分"], ["30", "30分"]]} />
              </fieldset>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="open" value="1" defaultChecked={params.open} className="size-5 accent-primary" />
                空き枠があるカードだけ
              </label>
              <input type="hidden" name="sort" value={params.sort} />
              <div className="flex gap-2">
                <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
                  <Search className="size-4" aria-hidden />
                  この条件で探す
                </button>
                {activeCount > 0 && (
                  <a href={clearHref} className={buttonClass("ghost")}>
                    クリア
                  </a>
                )}
              </div>
            </div>
          </FilterDrawer>
        </div>

        <section aria-label="検索結果" className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-text-sub">
              <span className="text-lg font-bold text-text">{rows.length}</span> 件
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-text-sub">並び替え</span>
              <AutoSubmitSelect name="sort" defaultValue={params.sort} className={`${INPUT} w-auto py-1.5 text-sm`} form="sort-form">
                <option value="recommended">おすすめ（異分野が先）</option>
                <option value="soon">空き枠が近い順</option>
                <option value="new">新着順</option>
              </AutoSubmitSelect>
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="条件に合うカードがありません">条件を減らすか、別のキーワードで探してみてください。</EmptyState>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <li key={r.offer.id}>
                  <SkillCard data={r.card} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </form>

      {/* 並び替えは今の条件を保ったまま送る */}
      <form id="sort-form" action="/search" hidden>
        {Object.entries({ kind: params.kind, field: params.field, faculty: params.faculty, mode: params.mode, duration: params.duration, open: params.open ? "1" : "", q: params.q })
          .filter(([, v]) => v)
          .map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
      </form>
    </div>
  );
}

function FilterGroup({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-bold">{label}</label>
      {children}
    </div>
  );
}

function Radios({ name, value, options }: { name: string; value: string; options: [string, string][] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(([v, label]) => (
        <label key={v || "any"} className="flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-border-strong bg-surface px-1 text-xs font-bold has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus">
          <input type="radio" name={name} value={v} defaultChecked={value === v} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}
