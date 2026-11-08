"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { EyeOff, ShieldCheck } from "lucide-react";
import { saveProfile } from "@/app/profile-actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { Field, INPUT } from "./ui";
import { GRADES } from "@/lib/constants";
import { GENDER_OPTIONS } from "@/lib/safety";
import { ENCOURAGE } from "@/lib/content";
import type { Faculty, Field as FieldRow, Gender, Profile } from "@/lib/types";

type Props = {
  profile: Profile;
  contact: { university_email: string; contact_email: string | null; notify_by_email: boolean; gender: Gender };
  /** 利用規約への同意欄を出すか（未同意・版が古いとき） */
  needsTermsAgreement: boolean;
  faculties: Faculty[];
  fields: FieldRow[];
  next: string;
  submitLabel: string;
};

export function ProfileForm({ profile, contact, faculties, fields, next, submitLabel, needsTermsAgreement }: Props) {
  const [state, action] = useActionState(saveProfile, undefined);
  const [facultyId, setFacultyId] = useState(profile.faculty_id ?? "");
  const [fieldCode, setFieldCode] = useState(profile.field_code ?? "");
  const [gender, setGender] = useState<Gender>(contact.gender);
  const [sameGenderOnly, setSameGenderOnly] = useState(profile.same_gender_only);

  function onFacultyChange(id: string) {
    setFacultyId(id);
    // 分野が未選択なら、学部の代表的な分野を初期値にする
    const faculty = faculties.find((f) => f.id === id);
    if (faculty && !fieldCode) setFieldCode(faculty.field_code);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <Field label="表示名（ニックネーム）" htmlFor="display_name" required hint="本名・学籍番号・SNSのIDは使わないでください。相手が当日声をかけるときに使います">
        <input id="display_name" name="display_name" required maxLength={30} defaultValue={profile.display_name} className={INPUT} />
      </Field>

      <Field label="学部" htmlFor="faculty_id" required>
        <select id="faculty_id" name="faculty_id" required value={facultyId} onChange={(e) => onFacultyChange(e.target.value)} className={INPUT}>
          <option value="" disabled>選んでください</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </Field>

      <Field label="分野" htmlFor="field_code" required hint="学部の代表的な分野が入ります。研究内容に合わせて変えてOK（例：工学部で情報系なら「情報」）">
        <select id="field_code" name="field_code" required value={fieldCode} onChange={(e) => setFieldCode(e.target.value)} className={INPUT}>
          <option value="" disabled>選んでください</option>
          {fields.map((f) => (
            <option key={f.code} value={f.code}>{f.label}</option>
          ))}
        </select>
      </Field>

      <div>
        <Field label="学年" htmlFor="grade">
          <select id="grade" name="grade" defaultValue={profile.grade ?? ""} className={INPUT}>
            <option value="">未設定</option>
            {GRADES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </Field>
      </div>

      <p className="flex gap-2 rounded-md bg-primary-soft px-3 py-2 text-xs text-primary">
        <EyeOff className="size-4 shrink-0" aria-hidden />
        他の人に見えるのは、ニックネーム・学部・学年・分野・自己紹介だけです。本名・学科・メールアドレス・性別は表示されません。
      </p>

      <Field label="自己紹介" htmlFor="bio" hint={ENCOURAGE.bioHint}>
        <textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={profile.bio ?? ""} className={INPUT} />
      </Field>

      <fieldset className="space-y-3 rounded-lg border border-primary/30 bg-surface p-4">
        <legend className="flex items-center gap-1.5 px-1 text-sm font-bold text-primary">
          <ShieldCheck className="size-4" aria-hidden />
          安心設定
        </legend>
        <Field label="性別（他の人には表示されません）" htmlFor="gender" hint="「同性からの申し込みのみ受け付ける」を使うときだけ必要です">
          <select
            id="gender"
            name="gender"
            value={gender}
            onChange={(e) => {
              const g = e.target.value as Gender;
              setGender(g);
              if (g === "unspecified") setSameGenderOnly(false);
            }}
            className={INPUT}
          >
            {GENDER_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </Field>
        <label className={`flex min-h-11 items-start gap-2 text-sm ${gender === "unspecified" ? "cursor-not-allowed text-text-sub" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            name="same_gender_only"
            checked={sameGenderOnly}
            disabled={gender === "unspecified"}
            onChange={(e) => setSameGenderOnly(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            <span className="block font-bold">同性からの申し込みのみ受け付ける</span>
            <span className="block text-xs text-text-sub">
              オンにすると、異性や性別を回答していない人はあなたに申し込めず、あなたのカードも表示されません。あなたも同性の人にだけ申し込めます。
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg bg-bg-section p-4">
        <legend className="sr-only">通知</legend>
        <Field
          label="通知を受け取るメールアドレス（任意）"
          htmlFor="contact_email"
          hint={`未入力なら大学のメール（${contact.university_email}）に届きます。普段見るアドレスがおすすめです`}
        >
          <input id="contact_email" name="contact_email" type="email" defaultValue={contact.contact_email ?? ""} placeholder="you@example.com" className={INPUT} />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="notify_by_email" defaultChecked={contact.notify_by_email} className="size-5 accent-primary" />
          予約・キャンセル・お礼をメールで知らせる
        </label>
      </fieldset>

      {needsTermsAgreement && (
        <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border-2 border-accent/40 bg-accent-soft p-4 text-sm">
          <input type="checkbox" name="agree_terms" required className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>
            <Link href="/guidelines" target="_blank" className="font-bold text-accent underline">利用規約・安全ガイドライン</Link>
            に同意します。ハラスメント・勧誘・出会い目的の行為が確認された場合は、1回で永久に利用停止となり、大学の関係部署に通報されることがあります。
          </span>
        </label>
      )}

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="保存中…">{submitLabel}</SubmitButton>
    </form>
  );
}
