/**
 * 広島大学の時限（2コマ続き）と昼休み。毎週のオフィスアワーで「この時間帯を登録」に使う。
 * 時刻が変わったら、ここだけ直せばよい。
 */
export const PERIODS = [
  { label: "1・2限", start: "08:45", end: "10:15" },
  { label: "3・4限", start: "10:30", end: "12:00" },
  { label: "昼休み", start: "12:00", end: "12:50" },
  { label: "5・6限", start: "12:50", end: "14:20" },
  { label: "7・8限", start: "14:35", end: "16:05" },
] as const;

/** "HH:MM" → 0時からの分 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 時間帯を1回の長さで分けたときの枠の数 */
export function slotCount(start: string, end: string, minutes: number): number {
  if (!/^\d{2}:\d{2}/.test(start) || !/^\d{2}:\d{2}/.test(end)) return 0;
  return Math.max(0, Math.floor((toMinutes(end) - toMinutes(start)) / minutes));
}
