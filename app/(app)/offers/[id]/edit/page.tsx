import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { loadMasters } from "@/lib/masters";
import { OfferForm } from "@/components/offer-form";
import { Card, PageTitle } from "@/components/ui";
import type { Offer } from "@/lib/types";

export default async function EditOfferPage({ params }: PageProps<"/offers/[id]/edit">) {
  const { id } = await params;
  const { supabase, profile } = await requireOnboarded();
  const [{ fields }, { data: offer }] = await Promise.all([
    loadMasters(supabase),
    supabase.from("offers").select("*").eq("id", id).eq("teacher_id", profile.id).maybeSingle<Offer>(),
  ]);
  if (!offer) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>カードを編集</PageTitle>
      <Card className="sm:p-7">
        <OfferForm offer={offer} fields={fields} defaultField={offer.field_code} />
      </Card>
    </div>
  );
}
