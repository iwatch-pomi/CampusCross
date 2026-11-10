import "server-only";
import type { ModerationStatus } from "./types";

export const STATUS_LABEL: Record<ModerationStatus, string> = {
  active: "利用中",
  on_hold: "一時停止中",
  banned: "永久凍結",
};

export const STATUS_TONE: Record<ModerationStatus, "success" | "warn" | "danger"> = {
  active: "success",
  on_hold: "warn",
  banned: "danger",
};

export const ACTION_LABEL: Record<string, string> = {
  auto_hold: "自動で一時停止",
  hold: "一時停止",
  release: "解除",
  ban: "永久凍結",
  unban: "凍結解除",
  resolve_report: "通報に対応",
  university_referral: "大学へ通報",
  official_on: "公式運営バッジを付けた",
  official_off: "公式運営バッジを外した",
};

export type ReportRow = {
  id: string;
  reason: string;
  detail: string | null;
  status: "open" | "reviewing" | "resolved";
  source: "report" | "review";
  booking_id: string | null;
  resolution: string | null;
  created_at: string;
  reporter: { id: string; display_name: string } | null;
  target: { id: string; display_name: string } | null;
  /** 対象の人の状態（admin_profiles で別に読む） */
  targetStatus?: ModerationStatus;
};

export const REPORT_SELECT =
  "id, reason, detail, status, source, booking_id, resolution, created_at, reporter:profiles!reports_reporter_id_fkey(id, display_name), target:profiles!reports_target_user_id_fkey(id, display_name)";
