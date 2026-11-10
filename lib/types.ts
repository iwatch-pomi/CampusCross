export type OfferKind = "topic" | "faculty_guide";
export type MeetingMode = "in_person" | "online";
export type MeetingPlace = "cafeteria" | "library" | "campus_cafe" | "zoom";
export type ModerationStatus = "active" | "on_hold" | "banned";
export type Gender = "female" | "male" | "unspecified";
export type SlotStatus = "open" | "booked" | "cancelled";
export type BookingStatus = "booked" | "completed" | "cancelled";

export type Field = { code: string; label: string; sort_order: number };
export type Faculty = { id: string; name: string; field_code: string; sort_order: number };

export type Profile = {
  id: string;
  display_name: string;
  faculty_id: string | null;
  field_code: string | null;
  grade: string | null;
  bio: string | null;
  same_gender_only: boolean;
  terms_version: string | null;
  terms_agreed_at: string | null;
  onboarded: boolean;
  is_admin: boolean;
  /** 公式運営バッジ（運営が付ける。本人は変えられない） */
  is_official: boolean;
  is_suspended: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
};

/** 他の人に見せるプロフィールの一部 */
/** 他の人に見せるプロフィール（ニックネーム・学部・学年まで。本名・学科・性別は出さない） */
export type PublicProfile = Pick<
  Profile,
  "id" | "display_name" | "faculty_id" | "field_code" | "grade" | "bio" | "same_gender_only" | "is_official"
> & { faculty: { name: string } | null };

export type Offer = {
  id: string;
  teacher_id: string;
  kind: OfferKind;
  title: string;
  hook: string;
  description: string | null;
  want_to_hear: string | null;
  field_code: string;
  tags: string[];
  duration_min: 15 | 30;
  is_active: boolean;
  created_at: string;
};

export type Slot = {
  id: string;
  teacher_id: string;
  start_at: string;
  end_at: string;
  /** 話せる場所の候補（1〜4つ）。予約する人がこの中から1つ選ぶ */
  places: MeetingPlace[];
  place_note: string | null;
  status: SlotStatus;
};

export type Booking = {
  id: string;
  slot_id: string;
  offer_id: string;
  learner_id: string;
  teacher_id: string;
  status: BookingStatus;
  message: string | null;
  /** 予約した人が選んだ場所 */
  place: MeetingPlace;
  is_cross_field: boolean;
  thanks_message: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  auto_completed: boolean;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type LedgerEntry = {
  id: number;
  amount: number;
  reason:
    | "signup_bonus"
    | "monthly_grant"
    | "booking_hold"
    | "booking_refund"
    | "teaching_reward"
    | "admin_adjust";
  booking_id: string | null;
  created_at: string;
};

/** Server Action の戻り値（useActionState 用） */
export type ActionState = { error?: string; ok?: boolean; message?: string } | undefined;
