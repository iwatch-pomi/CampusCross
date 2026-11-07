import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { loadContact, loadMasters } from "@/lib/masters";
import { ProfileForm } from "@/components/profile-form";

export default async function OnboardingPage() {
  const { supabase, user, profile } = await getCurrentMember();
  if (profile.onboarded) redirect("/");

  const [{ faculties, fields }, contact] = await Promise.all([
    loadMasters(supabase),
    loadContact(supabase, user.id),
  ]);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <p className="text-sm font-semibold text-indigo-600">ようこそ Campus-Cross へ</p>
      <h1 className="mt-1 text-xl font-bold">プロフィールを登録しましょう</h1>
      <p className="mt-2 mb-6 text-sm text-stone-600">
        学部と分野は「異分野」の判定に使います。チケットを3枚お渡ししました。
      </p>
      <ProfileForm
        profile={profile}
        contact={contact}
        faculties={faculties}
        fields={fields}
        next="/"
        submitLabel="はじめる"
      />
    </main>
  );
}
