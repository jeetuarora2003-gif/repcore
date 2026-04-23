import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getRemindersPipelineData, markMembershipsLapsed } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { sendAutoRemindersForGym } from "@/lib/actions/whatsapp-auto";
import { RemindersClient } from "@/components/reminders/reminders-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RemindersPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  console.log("DEBUG gym_id being queried:", session.gym.id);

  // Auto-lapse expired unpaid members before rendering
  await markMembershipsLapsed(session.gym.id);

  // Trigger auto-reminder engine for 'auto' mode gyms
  await sendAutoRemindersForGym(session.gym.id);

  // Fetch pipeline data
  const pipelineMembers = await getRemindersPipelineData(session.gym.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reminders"
        description="Date-aware 3-stage reminder pipeline. Filtered by days remaining until expiry."
      />

      <RemindersClient 
        pipelineMembers={pipelineMembers} 
        gymName={session.gym.name} 
      />
    </div>
  );
}
