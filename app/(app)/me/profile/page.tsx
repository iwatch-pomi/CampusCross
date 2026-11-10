import { CalendarClock } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { loadContact, loadMasters } from "@/lib/masters";
import { ProfileForm } from "@/components/profile-form";
import { SlotManager } from "@/components/slot-manager";
import { Card, PageTitle } from "@/components/ui";

export default async function EditProfilePage() {
  const { supabase, user, profile } = await requireOnboarded();
  const [{ faculties, fields }, contact] = await Promise.all([
    loadMasters(supabase),
    loadContact(supabase, user.id),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <div>
        <PageTitle>プロフィールを編集</PageTitle>
        <Card className="sm:p-7">
          <ProfileForm profile={profile} contact={contact} faculties={faculties} fields={fields} next="/me" submitLabel="保存する" needsTermsAgreement={false} />
        </Card>
      </div>

      <section id="slots" aria-labelledby="slots-title" className="scroll-mt-24">
        <h2 id="slots-title" className="flex items-center gap-2 text-2xl">
          <CalendarClock className="size-6 text-primary" aria-hidden />
          空き枠を登録
        </h2>
        <p className="mb-4 mt-1 text-sm text-text-sub">話せる時間をあらかじめ出しておくと、相手はワンクリックで予約できます。</p>
        <SlotManager supabase={supabase} teacherId={profile.id} stacked />
      </section>
    </div>
  );
}
