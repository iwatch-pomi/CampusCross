import type { ReactNode } from "react";

export const INPUT =
  "min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text placeholder:text-text-sub/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

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
      <label htmlFor={htmlFor} className="block text-sm font-bold">
        {label}
        {required && (
          <span className="ml-1.5 rounded-sm bg-point-soft px-1.5 py-0.5 text-xs text-point">必須</span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-text-sub">{hint}</p>}
    </div>
  );
}

/** 選択肢をカード状のボタンで見せるラジオ（種類・形式などの切り替え） */
export const CHOICE =
  "flex min-h-11 cursor-pointer flex-col justify-center rounded-md border border-border-strong bg-surface p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:ring-2 has-[:checked]:ring-primary/25 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus";

/** 横並び（左寄せ）の選択肢。中身の長さが違っても左端がそろう */
export const CHOICE_ROW = CHOICE.replace("flex-col justify-center", "flex-row justify-start");
