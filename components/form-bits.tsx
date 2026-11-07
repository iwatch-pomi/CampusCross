"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./ui/button";
import type { ActionState } from "@/lib/types";

export function SubmitButton({
  children,
  pendingText = "送信中…",
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
        {state.message}
      </p>
    );
  return null;
}
