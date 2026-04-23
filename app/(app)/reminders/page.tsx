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
import { cn } from "@/lib/utils/cn";

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {stageBuckets.map((bucket) => (
          <div key={bucket.stage} className="flex flex-col h-full min-w-0">
            {/* Column Header */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-t-2xl border-t border-x border-border bg-white/[0.03]",
              bucket.members.length === 0 && "rounded-b-2xl border-b opacity-60"
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn("h-2 w-2 rounded-full", 
                  bucket.stage === 5 ? "bg-yellow-500" : 
                  bucket.stage === 3 ? "bg-orange-500" : "bg-danger"
                )} />
                <span className="text-sm font-bold uppercase tracking-wider">{bucket.label}</span>
              </div>
              <Badge className={cn("rounded-lg px-2 py-0.5", bucket.badgeColor)}>
                {bucket.members.length}
              </Badge>
            </div>

            {/* Column Body */}
            <div className={cn(
              "flex-1 space-y-4 p-4 rounded-b-2xl border-x border-b border-border bg-white/[0.01]",
              bucket.members.length === 0 && "hidden"
            )}>
              {bucket.members.map((member) => {
                const message = buildReminderMessage(bucket.stage, {
                  name: member.memberName,
                  gymName,
                });
                const waUrl = buildWhatsAppUrl(member.memberPhone, message);

                return (
                  <Card key={member.membershipId} className="bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <MemberAvatar 
                          name={member.memberName} 
                          photoUrl={member.photoUrl} 
                          status={bucket.stage === 1 ? "expired" : "expiring_soon"} 
                          className="h-10 w-10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate text-[15px]">{member.memberName}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.memberPhone}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-white/5">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Expires</p>
                          <p className="text-xs font-semibold">{formatDate(member.endDate)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Due</p>
                          <p className="text-xs font-bold text-danger">{formatCurrency(member.duePaise)}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <ReminderWhatsappButton
                          subscriptionId={member.subscriptionId}
                          stage={bucket.stage}
                          whatsappUrl={waUrl}
                          className="w-full h-9 text-xs"
                        >
                          Send WhatsApp
                        </ReminderWhatsappButton>

                        <form action={markReminderPaidAction} className="w-full">
                          <input type="hidden" name="membershipId" value={member.membershipId} />
                          <input type="hidden" name="subscriptionId" value={member.subscriptionId} />
                          <Button type="submit" variant="ghost" size="sm" className="w-full h-9 text-[11px] text-muted-foreground hover:text-white">
                            Mark as Paid
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {bucket.members.length === 0 && (
              <div className="mt-4 p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center opacity-40">
                <p className="text-xs font-medium italic">No reminders</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
