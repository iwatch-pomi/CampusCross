"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/app/profile-actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { Field, INPUT } from "./ui";
import { GRADES } from "@/lib/constants";
import type { Faculty, Field as FieldRow, Profile } from "@/lib/types";

type Props = {
  profile: Profile;
  contact: { university_email: string; contact_email: string | null; notify_by_email: boolean };
  faculties: Faculty[];
  fields: FieldRow[];
  next: string;
  submitLabel: string;
};

export function ProfileForm({ profile, contact, faculties, fields, next, submitLabel }: Props) {
  const [state, action] = useActionState(saveProfile, undefined);
  const [facultyId, setFacultyId] = useState(profile.faculty_id ?? "");
  const [fieldCode, setFieldCode] = useState(profile.field_code ?? "");

  function onFacultyChange(id: string) {
    setFacultyId(id);
    // 分野が未選択なら、学部の代表的な分野を初期値にする
    const faculty = faculties.find((f) => f.id === id);
    if (faculty && !fieldCode) setFieldCode(faculty.field_code);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <Field label="表示名" htmlFor="display_name" required hint="ニックネームでもOK。相手が当日声をかけるときに使います">
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="学科・専攻" htmlFor="department">
          <input id="department" name="department" maxLength={60} defaultValue={profile.department ?? ""} className={INPUT} />
        </Field>
        <Field label="学年" htmlFor="grade">
          <select id="grade" name="grade" defaultValue={profile.grade ?? ""} className={INPUT}>
            <option value="">未設定</option>
            {GRADES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="自己紹介" htmlFor="bio" hint="研究していること、興味のある他分野など（500文字まで）">
        <textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={profile.bio ?? ""} className={INPUT} />
      </Field>

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

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="保存中…">{submitLabel}</SubmitButton>
    </form>
  );
}
