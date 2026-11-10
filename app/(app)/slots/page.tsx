import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { SlotManager } from "@/components/slot-manager";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "空き枠" };

export default async function SlotsPage() {
  const { supabase, profile } = await requireOnboarded();
  return (
    <div>
      <PageTitle sub="話せる時間をあらかじめ出しておくと、相手はワンクリックで予約できます。">オフィスアワー（空き枠）</PageTitle>
      <SlotManager supabase={supabase} teacherId={profile.id} />
    </div>
  );
}
