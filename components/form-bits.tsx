"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { BUTTON } from "./ui";
import type { ActionState } from "@/lib/types";

export function SubmitButton({
  children,
  pendingText = "送信中…",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: keyof typeof BUTTON;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${BUTTON[variant]} ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  return null;
}
