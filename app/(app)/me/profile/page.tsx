import { requireOnboarded } from "@/lib/auth";
import { loadContact, loadMasters } from "@/lib/masters";
import { ProfileForm } from "@/components/profile-form";
import { Card, PageTitle } from "@/components/ui";

export default async function EditProfilePage() {
  const { supabase, user, profile } = await requireOnboarded();
  const [{ faculties, fields }, contact] = await Promise.all([
    loadMasters(supabase),
    loadContact(supabase, user.id),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>プロフィールを編集</PageTitle>
      <Card className="sm:p-7">
        <ProfileForm profile={profile} contact={contact} faculties={faculties} fields={fields} next="/me" submitLabel="保存する" needsTermsAgreement={false} />
      </Card>
    </div>
  );
}
