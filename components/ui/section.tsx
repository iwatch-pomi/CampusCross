import type { ReactNode } from "react";

/** セクション見出し。label はピル型の小さな色付きラベル */
export function SectionHeading({
  label,
  title,
  sub,
  align = "left",
  action,
  as: Tag = "h2",
}: {
  label?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  const center = align === "center";
  return (
    <div className={`mb-6 flex gap-4 ${center ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div className={center ? "flex flex-col items-center" : ""}>
        {label && (
          <span className="mb-2 inline-block rounded-full bg-point-soft px-3 py-0.5 text-xs font-bold tracking-wider text-point">
            {label}
          </span>
        )}
        <Tag className={Tag === "h1" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}>{title}</Tag>
        {sub && <p className="mt-2 text-sm text-text-sub sm:text-base">{sub}</p>}
      </div>
      {action && !center && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl">{children}</h1>
      {sub && <p className="mt-1.5 text-sm text-text-sub">{sub}</p>}
    </div>
  );
}
