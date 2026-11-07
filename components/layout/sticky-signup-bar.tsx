"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { SIGNUP_CTA } from "@/lib/content";

/**
 * 未ログイン時の画面下部に固定する登録バー。
 * 登録フォーム（targetId）が見えている間は隠す。
 * 構想では登録は大学メールのみ（Google / Apple ログインはない）。
 */
export function StickySignupBar({ targetId = "signup" }: { targetId?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.1 });
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-float backdrop-blur transition-transform duration-200 ${hidden ? "translate-y-full" : ""}`}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <p className="hidden flex-1 text-sm sm:block">
          <span className="block text-xs font-bold text-accent">{SIGNUP_CTA.micro}</span>
          {SIGNUP_CTA.note}
        </p>
        <a href={`#${targetId}`} tabIndex={hidden ? -1 : 0} className={buttonClass("accent", "md", "w-full sm:w-auto")}>
          <Mail className="size-4" aria-hidden />
          大学メールではじめる
        </a>
      </div>
    </div>
  );
}
