import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { OfferForm } from "@/components/offer-form";
import { Card, PageTitle } from "@/components/ui";

export default async function NewOfferPage() {
  const { supabase, profile } = await requireOnboarded();
  const { fields } = await loadMasters(supabase);
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle sub="カードを出したら、「空き枠」から話せる時間を登録しましょう。">募集カードをつくる</PageTitle>
      <Card className="sm:p-7">
        <OfferForm fields={fields} defaultField={profile.field_code ?? "other"} />
      </Card>
    </div>
  );
}
