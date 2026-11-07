"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";
import { SubmitButton } from "@/components/form-bits";
import { Field, INPUT } from "@/components/ui";

export function LoginForm({ domainHint }: { domainHint: string }) {
  // コード入力画面から「メールアドレスを変える」で戻れるように、画面を key で作り直す
  const [round, setRound] = useState(0);
  return <Steps key={round} domainHint={domainHint} onRestart={() => setRound((r) => r + 1)} />;
}

function Steps({ domainHint, onRestart }: { domainHint: string; onRestart: () => void }) {
  const [state, action] = useActionState(login, { step: "email" } as LoginState);

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-4">
        <Field label="大学のメールアドレス" htmlFor="email" hint={`@${domainHint} のアドレスで登録できます`}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder={`b123456@${domainHint}`}
            className={INPUT}
          />
        </Field>
        {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
        <SubmitButton className="w-full" pendingText="送信中…">ログインコードを送る</SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-stone-700">
        <span className="font-semibold">{state.email}</span> にログインコードを送りました。
        届かない場合は迷惑メールフォルダも確認してください。
      </p>
      <Field label="ログインコード" htmlFor="code">
        <input
          id="code"
          name="code"
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9 ]*"
          maxLength={12}
          placeholder="123456"
          className={`${INPUT} tracking-[0.3em]`}
        />
      </Field>
      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <SubmitButton className="w-full" pendingText="確認中…">ログイン</SubmitButton>
      <button type="button" onClick={onRestart} className="w-full text-sm text-stone-500 underline">
        メールアドレスを入力し直す
      </button>
    </form>
  );
}
