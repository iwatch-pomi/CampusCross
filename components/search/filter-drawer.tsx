"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/**
 * 絞り込みパネル。PC（lg 以上）では左サイドバーとして常に表示し、
 * SP では「絞り込み」ボタンで開くドロワーにする。中身（フォーム）は1つだけ描画する。
 */
export function FilterDrawer({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="filter-panel" className={buttonClass("outline", "md", "lg:hidden")}>
        <SlidersHorizontal className="size-4" aria-hidden />
        絞り込み{activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-on-primary">{activeCount}</span>}
      </button>

      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-overlay/40 lg:hidden" />}

      <div
        id="filter-panel"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="絞り込み"
        className={`${open ? "fixed inset-y-0 left-0 z-50 w-88 max-w-full overflow-y-auto bg-surface p-5 shadow-card-hover" : "hidden"} lg:static lg:z-auto lg:block lg:w-auto lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="font-bold">絞り込み</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="flex size-11 items-center justify-center rounded-full hover:bg-bg-section">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
