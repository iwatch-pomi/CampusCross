import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "accent" | "outline" | "pill" | "soft" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const BASE =
  "min-h-11 items-center justify-center gap-2 whitespace-nowrap font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "rounded-md bg-primary text-on-primary hover:bg-primary-strong",
  accent: "rounded-md bg-accent text-on-primary hover:bg-accent-strong",
  outline: "rounded-md border-2 border-primary bg-surface text-primary hover:bg-primary-soft",
  pill: "rounded-full border border-primary bg-surface text-primary hover:bg-primary-soft",
  soft: "rounded-md bg-primary-soft text-primary hover:bg-primary-soft/70",
  ghost: "rounded-md text-text-sub hover:bg-bg-section hover:text-text",
  danger: "rounded-md border border-danger bg-surface text-danger hover:bg-danger-soft",
};

const SIZE: Record<ButtonSize, string> = {
  md: "px-4 text-sm",
  lg: "min-h-13 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  // extra に hidden（例: "hidden lg:inline-flex"）があるときは、表示方法を呼び出し側に任せる
  const display = /(^|\s)hidden(\s|$)/.test(extra) ? "" : "inline-flex";
  return `${display} ${BASE} ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

type Common = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className = "", type = "button", ...props }: ComponentProps<"button"> & Common) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className = "", ...props }: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
