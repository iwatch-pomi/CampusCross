"use client";

import { useActionState, useState } from "react";
import { createOffer, updateOffer } from "@/app/(app)/offers/actions";
import { FormMessage, SubmitButton } from "./form-bits";
import { Field, INPUT } from "./ui";
import { FACULTY_GUIDE_TEMPLATE, HOOK_PLACEHOLDER, TITLE_PLACEHOLDER } from "@/lib/constants";
import type { Field as FieldRow, Offer, OfferKind } from "@/lib/types";

export function OfferForm({
  offer,
  fields,
  defaultField,
}: {
  offer?: Offer;
  fields: FieldRow[];
  defaultField: string;
}) {
  const [state, action] = useActionState(offer ? updateOffer : createOffer, undefined);
  const [kind, setKind] = useState<OfferKind>(offer?.kind ?? "topic");
  const [description, setDescription] = useState(offer?.description ?? "");

  function chooseKind(next: OfferKind) {
    setKind(next);
    // 「学部のしくみ」を選んだら、説明欄が空のときだけテンプレートを入れる
    if (next === "faculty_guide" && description.trim() === "") setDescription(FACULTY_GUIDE_TEMPLATE);
    if (next === "topic" && description === FACULTY_GUIDE_TEMPLATE) setDescription("");
  }

  return (
    <form action={action} className="space-y-5">
      {offer && <input type="hidden" name="id" value={offer.id} />}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-stone-800">カードの種類</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["topic", "専門テーマ", "自分の研究・専門を噛み砕いて話す"],
              ["faculty_guide", "学部のしくみ", "ゼミ・研究室の決まり方、卒論など"],
            ] as const
          ).map(([value, label, sub]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-3 text-sm ${kind === value ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-stone-300 bg-white"}`}
            >
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => chooseKind(value)} className="sr-only" />
              <span className="block font-semibold">{label}</span>
              <span className="mt-0.5 block text-xs text-stone-500">{sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="タイトル（問いの形がおすすめ）" htmlFor="title" required hint="5〜60文字">
        <input id="title" name="title" required minLength={5} maxLength={60} defaultValue={offer?.title} placeholder={TITLE_PLACEHOLDER[kind]} className={INPUT} />
      </Field>

      <Field label="専門外の人へのひとこと" htmlFor="hook" required hint="前提知識がなくても来ていいことを伝えましょう（140文字まで）">
        <input id="hook" name="hook" required maxLength={140} defaultValue={offer?.hook} placeholder={HOOK_PLACEHOLDER[kind]} className={INPUT} />
      </Field>

      <Field label="くわしい説明" htmlFor="description" hint={kind === "faculty_guide" ? "話す内容の目安です。全部埋めなくてOK" : "話す内容、相手に持ってきてほしいものなど（1000文字まで）"}>
        <textarea id="description" name="description" rows={kind === "faculty_guide" ? 8 : 5} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
      </Field>

      <Field label="あなたの分野から聞きたいこと" htmlFor="want_to_hear" hint="一方的な講義ではなく交換にするための欄です（例：情報系の人に、このデータの解析方法を聞いてみたい）">
        <input id="want_to_hear" name="want_to_hear" maxLength={140} defaultValue={offer?.want_to_hear ?? ""} className={INPUT} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="分野" htmlFor="field_code" required>
          <select id="field_code" name="field_code" required defaultValue={offer?.field_code ?? defaultField} className={INPUT}>
            {fields.map((f) => (
              <option key={f.code} value={f.code}>{f.label}</option>
            ))}
          </select>
        </Field>
        <Field label="時間" htmlFor="duration_min">
          <select id="duration_min" name="duration_min" defaultValue={String(offer?.duration_min ?? 15)} className={INPUT}>
            <option value="15">15分</option>
            <option value="30">30分</option>
          </select>
        </Field>
      </div>

      <Field label="タグ" htmlFor="tags" hint="スペースかカンマで区切って5つまで">
        <input id="tags" name="tags" defaultValue={offer?.tags.join(" ")} placeholder="Python 統計 培養" className={INPUT} />
      </Field>

      {offer && (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="is_active" defaultChecked={offer.is_active} className="size-4 accent-indigo-600" />
          公開する（外すと一覧に出なくなります。入っている予約はそのまま残ります）
        </label>
      )}

      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="保存中…">{offer ? "保存する" : "カードを公開する"}</SubmitButton>
    </form>
  );
}
