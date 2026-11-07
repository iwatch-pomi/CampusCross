"use client";

import type { ComponentProps } from "react";

/** 選んだらそのまま検索し直すセレクト（並び替え用） */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
