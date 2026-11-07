"use client";

import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";
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
        <Field label="大学のメールアドレス" htmlFor="email" hint={`@${domainHint} のアドレスで登録・ログインできます。パスワードは不要です`}>
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
        {state.error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <SubmitButton variant="accent" size="lg" className="w-full" pendingText="送信中…">ログインコードを送る</SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="flex gap-2 rounded-md bg-primary-soft p-3 text-sm">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="font-bold">{state.email}</span> にログインコードを送りました。
          届かない場合は迷惑メールフォルダも確認してください。
        </span>
      </p>
      <Field label="ログインコード（6桁）" htmlFor="code">
        <input
          id="code"
          name="code"
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9 ]*"
          maxLength={12}
          placeholder="123456"
          className={`${INPUT} text-center text-xl font-bold tracking-widest`}
        />
      </Field>
      {state.error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <SubmitButton variant="accent" size="lg" className="w-full" pendingText="確認中…">ログイン</SubmitButton>
      <button type="button" onClick={onRestart} className="min-h-11 w-full text-sm text-text-sub underline">
        メールアドレスを入力し直す
      </button>
    </form>
  );
}
