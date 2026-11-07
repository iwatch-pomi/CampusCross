import { requireOnboarded } from "@/lib/auth";
import { loadContact, loadMasters } from "@/lib/masters";
import { ProfileForm } from "@/components/profile-form";
import { PageTitle } from "@/components/ui";

export default async function EditProfilePage() {
  const { supabase, user, profile } = await requireOnboarded();
  const [{ faculties, fields }, contact] = await Promise.all([
    loadMasters(supabase),
    loadContact(supabase, user.id),
  ]);
  return (
    <>
      <PageTitle>プロフィールを編集</PageTitle>
      <ProfileForm profile={profile} contact={contact} faculties={faculties} fields={fields} next="/me" submitLabel="保存する" />
    </>
  );
}
