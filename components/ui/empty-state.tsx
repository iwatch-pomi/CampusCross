import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
        {icon ?? <Sparkles className="size-7" />}
      </span>
      <p className="font-bold">{title}</p>
      {children && <div className="text-sm text-text-sub">{children}</div>}
      {action}
    </div>
  );
}
