import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { markReminderPaidAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getRemindersPipelineData, markMembershipsLapsed } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ReminderWhatsappButton } from "@/components/reminders/reminder-whatsapp-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildReminderMessage } from "@/lib/utils/reminders";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ReminderPipelineMember } from "@/lib/db/queries";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { sendAutoRemindersForGym } from "@/lib/actions/whatsapp-auto";

export const dynamic = "force-dynamic";

type StageConfig = {
  stage: 5 | 3 | 1;
  label: string;
  badgeVariant: "warning" | "warning" | "danger";
  badgeColor: string;
};

const STAGES: StageConfig[] = [
  { stage: 5, label: "5 Days Left", badgeVariant: "warning", badgeColor: "bg-yellow-500/15 text-yellow-400" },
  { stage: 3, label: "3 Days Left", badgeVariant: "warning", badgeColor: "bg-orange-500/15 text-orange-400" },
  { stage: 1, label: "Last Day", badgeVariant: "danger", badgeColor: "bg-danger/15 text-danger" },
];

function filterForStage(members: ReminderPipelineMember[], stage: 5 | 3 | 1): ReminderPipelineMember[] {
  return members.filter((m) => {
    if (m.daysRemaining !== stage) return false;
    // Check that the reminder for this stage hasn't been sent yet
    if (stage === 5 && m.reminder5SentAt) return false;
    if (stage === 3 && m.reminder3SentAt) return false;
    if (stage === 1 && m.reminder1SentAt) return false;
    return true;
  });
}

export default async function RemindersPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  // Auto-lapse expired unpaid members before rendering
  await markMembershipsLapsed(session.gym.id);

  // Trigger auto-reminder engine for 'auto' mode gyms
  await sendAutoRemindersForGym(session.gym.id);

  // Fetch pipeline data
  const pipelineMembers = await getRemindersPipelineData(session.gym.id);

  const gymName = session.gym.name;

  // Check if any stage has members
  const stageBuckets = STAGES.map((cfg) => ({
    ...cfg,
    members: filterForStage(pipelineMembers, cfg.stage),
  }));

  const totalMembers = stageBuckets.reduce((sum, b) => sum + b.members.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Date-aware 3-stage reminder pipeline. Members appear on days 5, 3, and 1 before expiry."
      />

      <div className="bg-black text-green-500 font-mono text-xs p-4 rounded overflow-auto border border-green-500/30">
        <h3 className="text-white border-b border-green-500/30 mb-2 pb-1">DIAGNOSTIC PIPELINE DUMP V2</h3>
        <div>Total Found from DB Query: {pipelineMembers.length}</div>
        <pre>{JSON.stringify(pipelineMembers, null, 2)}</pre>
      </div>


      {totalMembers === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="rounded-3xl bg-accent/10 p-5 text-accent">
              <ChevronDown className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">All clear!</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                No members need reminders right now. Members will appear here exactly 5 days, 3 days, and 1 day before their subscription expires.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stageBuckets.map((bucket) => {
        if (bucket.members.length === 0) return null;

        return (
          <details key={bucket.stage} open className="group">
            <summary className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-5 py-4 transition-colors hover:bg-white/[0.05]">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              <span className="text-base font-semibold">{bucket.label}</span>
              <Badge className={bucket.badgeColor}>
                {bucket.members.length} member{bucket.members.length !== 1 ? "s" : ""}
              </Badge>
            </summary>

            <div className="mt-3 space-y-3">
              {bucket.members.map((member) => {
                const message = buildReminderMessage(bucket.stage, {
                  name: member.memberName,
                  gymName,
                });
                const waUrl = buildWhatsAppUrl(member.memberPhone, message);

                return (
                  <Card key={member.membershipId}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <MemberAvatar name={member.memberName} photoUrl={member.photoUrl} status={bucket.stage === 1 ? "expired" : "expiring_soon"} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{member.memberName}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground truncate">{member.memberPhone}</p>
                          </div>
                        </div>
                        <Badge className={bucket.badgeColor}>{bucket.label}</Badge>
                      </div>

                      <div className="mt-3 grid gap-3 rounded-xl border border-border bg-white/[0.02] p-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Plan</p>
                          <p className="mt-1 text-sm font-medium">{member.planName}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Expires</p>
                          <p className="mt-1 text-sm font-medium">{formatDate(member.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Outstanding</p>
                          <p className="mt-1 text-sm font-semibold text-danger">{formatCurrency(member.duePaise)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <ReminderWhatsappButton
                          subscriptionId={member.subscriptionId}
                          stage={bucket.stage}
                          whatsappUrl={waUrl}
                        >
                          Send Reminder
                        </ReminderWhatsappButton>

                        <form action={markReminderPaidAction}>
                          <input type="hidden" name="membershipId" value={member.membershipId} />
                          <input type="hidden" name="subscriptionId" value={member.subscriptionId} />
                          <Button type="submit" variant="outline" size="sm">
                            Fee Paid ({formatCurrency(member.duePaise)})
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
