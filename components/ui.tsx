import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}

type Tone = "neutral" | "cross" | "guide" | "ok" | "warn" | "muted";
const TONES: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  cross: "bg-teal-50 text-teal-800 ring-1 ring-teal-200",
  guide: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  ok: "bg-emerald-50 text-emerald-800",
  warn: "bg-rose-50 text-rose-800",
  muted: "bg-stone-50 text-stone-500",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
export const BUTTON = {
  primary: `${BUTTON_BASE} bg-indigo-600 text-white hover:bg-indigo-700`,
  secondary: `${BUTTON_BASE} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50`,
  danger: `${BUTTON_BASE} border border-rose-300 bg-white text-rose-700 hover:bg-rose-50`,
  ghost: `${BUTTON_BASE} text-stone-600 hover:bg-stone-100`,
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof BUTTON }) {
  return <Link className={`${BUTTON[variant]} ${className}`} {...props} />;
}

export const INPUT =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-800">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold text-stone-900">{children}</h1>
      {sub && <p className="mt-1 text-sm text-stone-600">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
      {children}
    </p>
  );
}
