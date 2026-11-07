import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { getCurrentMember } from "@/lib/auth";
import { loadContact, loadMasters } from "@/lib/masters";
import { ProfileForm } from "@/components/profile-form";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/layout/logo";
import { DecorationCircles } from "@/components/decor/decoration-circles";

export default async function OnboardingPage() {
  const { supabase, user, profile } = await getCurrentMember();
  if (profile.onboarded) redirect("/");

  const [{ faculties, fields }, contact] = await Promise.all([
    loadMasters(supabase),
    loadContact(supabase, user.id),
  ]);

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-gradient-hero">
      <DecorationCircles preset="hero" />
      <main className="relative mx-auto max-w-lg px-4 py-8">
        <Logo />
        <div className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card-hover">
          <div className="mb-6 flex items-center gap-4">
            <Avatar seed={user.id} size="lg" />
            <div>
              <p className="text-sm font-bold text-primary">ようこそ！</p>
              <h1 className="text-xl">プロフィールを登録しましょう</h1>
            </div>
          </div>
          <p className="mb-6 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
            <Ticket className="size-5 shrink-0" aria-hidden />
            チケットを3枚お渡ししました。学部と分野は「異分野」の判定に使います。
          </p>
          <ProfileForm profile={profile} contact={contact} faculties={faculties} fields={fields} next="/" submitLabel="はじめる" />
        </div>
      </main>
    </div>
  );
}
