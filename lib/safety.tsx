import { Coffee, Library, UtensilsCrossed, Video, type LucideIcon } from "lucide-react";
import type { MeetingPlace } from "./types";

/**
 * 実施場所は学内のパブリックスペース3種と Zoom に固定する（DB の meeting_place と同じ）。
 * 個室・研究室・自宅などの密室は選べない。
 */
export const PLACES: Record<MeetingPlace, { label: string; hint: string; icon: LucideIcon }> = {
  cafeteria: { label: "学食", hint: "人の多い時間帯の学生食堂", icon: UtensilsCrossed },
  library: { label: "図書館フリースペース", hint: "会話できるラーニングコモンズなど", icon: Library },
  campus_cafe: { label: "キャンパス内カフェ", hint: "学内のカフェ・売店のイートイン", icon: Coffee },
  zoom: { label: "Zoom", hint: "URLは予約した人にだけ表示されます", icon: Video },
};

export const PLACE_ORDER: MeetingPlace[] = ["cafeteria", "library", "campus_cafe", "zoom"];

/** 例: 「学食・入口すぐのテーブル」 */
export function placeLabel(slot: { place: MeetingPlace; place_note: string | null }): string {
  const base = PLACES[slot.place]?.label ?? "学内";
  return slot.place_note ? `${base}・${slot.place_note}` : base;
}

/** 安全レビューで選べる「気になったこと」（DB の safety_reviews.flags と同じ） */
export const REVIEW_FLAGS: { code: string; label: string; serious: boolean }[] = [
  { code: "dating", label: "出会い目的・デートや飲みに誘われた", serious: true },
  { code: "contact_pushing", label: "連絡先やSNSをしつこく聞かれた", serious: true },
  { code: "solicitation", label: "勧誘を受けた（宗教・ビジネス・団体など）", serious: true },
  { code: "harassment", label: "ハラスメント・不快な言動・身体への接触", serious: true },
  { code: "place_change", label: "決めた場所以外（個室など）へ移動しようと言われた", serious: true },
  { code: "off_topic", label: "テーマと関係ない話ばかりだった", serious: false },
  { code: "overtime", label: "時間を大きく超えて引き止められた", serious: false },
  { code: "no_show", label: "相手が来なかった", serious: false },
];

export const REPORT_REASONS: { code: string; label: string }[] = [
  { code: "dating", label: "出会い目的・個人的な誘い" },
  { code: "contact_pushing", label: "連絡先・SNSのしつこい要求" },
  { code: "solicitation", label: "勧誘・営業" },
  { code: "harassment", label: "ハラスメント・不快な言動" },
  { code: "place_change", label: "決めた場所以外への誘導" },
  { code: "no_show", label: "来なかった" },
  { code: "other", label: "その他" },
];

export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS.map((r) => [r.code, r.label]));

export const FEELING_LABEL = { safe: "安心して話せた", uneasy: "少し気になった", problem: "問題があった" } as const;

export const GENDER_OPTIONS = [
  ["unspecified", "回答しない"],
  ["female", "女性"],
  ["male", "男性"],
] as const;

/** DB の has_contact_info と同じ判定（フォームで先にエラーを出すため） */
export function hasContactInfo(text: string | null | undefined): boolean {
  if (!text) return false;
  return new RegExp(
    [
      "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}",
      "https?://|www\\.",
      "0[0-9]{1,4}[-ー−‐ ]?[0-9]{1,4}[-ー−‐ ]?[0-9]{3,4}",
      "@[a-z0-9_.]{3,}",
      "line ?id|(line|ライン)(交換|追加|教えて)",
      "インスタ|instagram|twitter|ツイッター|tiktok|discord|ディスコード|facebook|フェイスブック|x\\.com",
    ].join("|"),
    "i",
  ).test(text);
}

export const CONTACT_INFO_ERROR = "連絡先・SNSアカウント・URLは書き込めません（安全のため、連絡先の交換は当日対面で任意に行ってください）";
