"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** 横スクロールのカード列。PC では右端・左端に矢印ボタンを出す */
export function SkillCarousel({ label, children }: { label: string; children: ReactNode[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <div className="relative">
      <ul
        ref={ref}
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1"
      >
        {children.map((child, i) => (
          <li key={i} className="w-64 shrink-0 snap-start sm:w-72">
            {child}
          </li>
        ))}
      </ul>
      {!edge.start && (
        <ArrowButton side="left" onClick={() => scroll(-1)} label={`${label}を前へ`}>
          <ChevronLeft className="size-5" />
        </ArrowButton>
      )}
      {!edge.end && (
        <ArrowButton side="right" onClick={() => scroll(1)} label={`${label}を次へ`}>
          <ChevronRight className="size-5" />
        </ArrowButton>
      )}
    </div>
  );
}

function ArrowButton({ side, onClick, label, children }: { side: "left" | "right"; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-card-hover hover:text-primary md:flex ${side === "left" ? "-left-3" : "-right-3"}`}
    >
      {children}
    </button>
  );
}
