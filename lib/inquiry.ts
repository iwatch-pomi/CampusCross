/** 問い合わせの種類（DB の inquiry_category と同じ並び） */
export const INQUIRY_CATEGORIES = [
  { code: "usage", label: "使い方について" },
  { code: "login", label: "ログイン・登録できない" },
  { code: "bug", label: "不具合・表示がおかしい" },
  { code: "safety", label: "安全・トラブルについて" },
  { code: "account", label: "アカウント・利用停止について" },
  { code: "idea", label: "こうしてほしい（要望）" },
  { code: "other", label: "その他" },
] as const;

export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number]["code"];
export type InquiryStatus = "open" | "answered" | "closed";

export const INQUIRY_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(INQUIRY_CATEGORIES.map((c) => [c.code, c.label]));
export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = { open: "返信待ち", answered: "返信済み", closed: "対応済み" };

export function isInquiryCategory(v: string): v is InquiryCategory {
  return INQUIRY_CATEGORIES.some((c) => c.code === v);
}

export type Inquiry = {
  id: string;
  user_id: string | null;
  category: InquiryCategory;
  body: string;
  reply_email: string | null;
  status: InquiryStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};
