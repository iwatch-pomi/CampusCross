const TZ = "Asia/Tokyo";

const dateFmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TZ, month: "numeric", day: "numeric", weekday: "short",
});
const timeFmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TZ, hour: "2-digit", minute: "2-digit",
});
const fullFmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
});

/** 例: 11/12(水) 12:20〜12:35 */
export function formatSlot(startAt: string, endAt: string): string {
  const s = new Date(startAt);
  const e = new Date(endAt);
  return `${dateFmt.format(s).replace(/\((.)\)/, "($1)")} ${timeFmt.format(s)}〜${timeFmt.format(e)}`;
}

export function formatDateTime(at: string): string {
  return fullFmt.format(new Date(at));
}

export function minutesBetween(startAt: string, endAt: string): number {
  return Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
}

/** 日本時間の日付・時刻の入力から ISO 文字列を作る */
export function jstToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}

/** 日本時間で今日の日付（YYYY-MM-DD） */
export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

/** 開始時刻を過ぎているか（Server Component でリクエストごとに評価する） */
export function hasStarted(startAt: string): boolean {
  return new Date(startAt).getTime() <= Date.now();
}

/** いまから days 日前の時刻（ISO 文字列）。一覧の絞り込みに使う */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** いまから hours 時間後の時刻（ISO 文字列） */
export function hoursFromNowIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/** 曜日（月曜はじまり。DB の weekly_hours.weekday は 1=月 … 7=日） */
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
