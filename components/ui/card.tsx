import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-lg border border-border bg-surface p-5 shadow-card ${className}`} {...props} />;
}
