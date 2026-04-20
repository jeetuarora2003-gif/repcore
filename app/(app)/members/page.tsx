import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getMembersPageData, getMembershipPlans, markMembershipsLapsed } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { AddMemberFab } from "@/components/members/add-member-fab";
import { MembersClient } from "@/components/members/members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");
  
  const { tab } = await searchParams;

  // Background lapse check — runs on every members page load
  await markMembershipsLapsed(session.gym.id);

  const isArchivedView = tab === "archived";

  const [members, plans] = await Promise.all([
    // If we are looking for archived, includeArchived should be true (and we filter client-side, 
    // or just pass true to getGymCoreData so it returns archived members). Wait, getMembersPageData
    // returns records. We pass `includeArchived = isArchivedView`.
    getMembersPageData(
      session.gym.id, 
      session.settings?.expiring_warning_days ?? 7, 
      "",       // The server shouldn't filter by search, the client does
      "all",    // The server shouldn't filter by status, the client does
      isArchivedView  // includeArchived parameter
    ),
    getMembershipPlans(session.gym.id),
  ]);

  const gymName = session.gym.name;

  return (
    <div className="space-y-6 pb-28">
      <PageHeader title="Members" description="Manage joins, renewals, archives, and member status from one place." />

      <MembersClient members={members} gymName={gymName} />

      {/* Floating Action Button (acts as sole entry point for Add Member wizard) */}
      <AddMemberFab plans={plans} />
    </div>
  );
}
