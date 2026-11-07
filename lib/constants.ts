import type { LedgerEntry, OfferKind } from "./types";

export const GRADES = [
  ["B1", "学部1年"], ["B2", "学部2年"], ["B3", "学部3年"], ["B4", "学部4年"],
  ["B5", "学部5年"], ["B6", "学部6年"], ["M1", "修士1年"], ["M2", "修士2年"],
  ["D1", "博士1年"], ["D2", "博士2年"], ["D3", "博士3年"], ["other", "その他"],
] as const;

export const GRADE_LABEL: Record<string, string> = Object.fromEntries(GRADES);

export const KIND_LABEL: Record<OfferKind, string> = {
  topic: "専門テーマ",
  faculty_guide: "学部のしくみ",
};

export const LEDGER_LABEL: Record<LedgerEntry["reason"], string> = {
  signup_bonus: "登録ボーナス",
  monthly_grant: "今月の配布",
  booking_hold: "予約（仮押さえ）",
  booking_refund: "キャンセルによる返却",
  teaching_reward: "教えたお礼",
  admin_adjust: "運営による調整",
};

/** 人目のある学内の場所の候補（自由入力も可） */
export const LOCATION_SUGGESTIONS = [
  "中央図書館",
  "学生プラザ",
  "生協の食堂",
  "学部棟のラウンジ",
];

export const TITLE_PLACEHOLDER: Record<OfferKind, string> = {
  topic: "15分でわかる：〇〇って結局なにがすごいの？",
  faculty_guide: "〇〇学部のゼミってどうやって決まる？",
};

export const HOOK_PLACEHOLDER: Record<OfferKind, string> = {
  topic: "前提知識ゼロでOK。高校の生物を覚えていなくても大丈夫です",
  faculty_guide: "他学部の人向けに、うちの学部の仕組みを話します",
};

/** 「学部のしくみ」カードの説明欄のテンプレート */
export const FACULTY_GUIDE_TEMPLATE = `1. ゼミ・研究室はいつ、どうやって決まる？（時期、希望の出し方、選考の有無）
2. 所属は必修？ 入らない人もいる？
3. 卒論・卒業研究はある？ どれくらいの分量・期間？
4. ゼミ・研究室での普段の過ごし方
5. 卒業後の進路の傾向
6. 他学部の人に「ここが意外」と言われること`;

export function allowedEmailDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** DB の private.is_allowed_email と同じ判定（サブドメインも許可） */
export function isAllowedEmail(email: string, domains = allowedEmailDomains()): boolean {
  const host = email.trim().toLowerCase().split("@")[1];
  if (!host) return false;
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}
