"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { ReminderWhatsappButton } from "@/components/reminders/reminder-whatsapp-button";
import { Button } from "@/components/ui/button";
import { markReminderPaidAction } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { buildReminderMessage } from "@/lib/utils/reminders";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";
import { Bell, Clock, AlertTriangle } from "lucide-react";
import type { ReminderPipelineMember } from "@/lib/db/queries";

type StageConfig = {
  stage: 5 | 3 | 1;
  label: string;
  badgeColor: string;
  icon: any;
};

const STAGES: StageConfig[] = [
  { stage: 5, label: "5 Days Left", badgeColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  { stage: 3, label: "3 Days Left", badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Bell },
  { stage: 1, label: "Last Day", badgeColor: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertTriangle },
];

export function RemindersClient({ 
  pipelineMembers, 
  gymName 
}: { 
  pipelineMembers: ReminderPipelineMember[],
  gymName: string
}) {
  const filterForStage = (stage: number) => {
    return pipelineMembers; // DEBUG: Show everyone in every tab
  };

  const stageBuckets = STAGES.map((cfg) => ({
    ...cfg,
    members: filterForStage(cfg.stage),
  }));

  const defaultTab = stageBuckets.find(b => b.members.length > 0)?.stage.toString() || "5";

  return (
    <Tabs defaultValue={defaultTab} className="w-full space-y-8">
      <TabsList className="grid w-full grid-cols-3 h-14 bg-white/5 border border-white/10 p-1 rounded-2xl">
        {stageBuckets.map((bucket) => (
          <TabsTrigger 
            key={bucket.stage} 
            value={bucket.stage.toString()}
            className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <bucket.icon className="h-4 w-4 hidden sm:inline" />
              <span className="font-semibold">{bucket.label}</span>
              {bucket.members.length > 0 && (
                <Badge variant="default" className="ml-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-white/10 text-[10px] p-0">
                  {bucket.members.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
        ))}
      </TabsList>

      {stageBuckets.map((bucket) => (
        <TabsContent key={bucket.stage} value={bucket.stage.toString()} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {bucket.members.length === 0 ? (
            <Card className="border-dashed bg-transparent border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <bucket.icon className="h-10 w-10 mb-4 text-muted-foreground" />
                <p className="text-sm font-medium italic">No reminders for this stage</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {/* Header for the list - Desktop only */}
              <div className="hidden md:flex items-center px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <div className="flex-1">Member</div>
                <div className="w-32 text-center">Expires</div>
                <div className="w-32 text-center">Outstanding</div>
                <div className="w-48 text-right">Actions</div>
              </div>

              {bucket.members.map((member) => {
                const message = buildReminderMessage(bucket.stage, {
                  name: member.memberName,
                  gymName,
                });
                const waUrl = buildWhatsAppUrl(member.memberPhone, message);

                return (
                  <div 
                    key={member.membershipId} 
                    className="group flex flex-col md:flex-row md:items-center gap-4 p-4 md:px-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-200"
                  >
                    {/* Member Info Strip */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <MemberAvatar 
                        name={member.memberName} 
                        photoUrl={member.photoUrl} 
                        status={bucket.stage === 1 ? "expired" : "expiring_soon"} 
                        className="h-10 w-10 shrink-0 ring-2 ring-white/5"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-bold text-[15px] leading-none">{member.memberName}</p>
                          <Badge variant="default" className="text-[9px] h-4 px-1 opacity-50">
                            {member.daysRemaining}d
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">{member.memberPhone} · {member.planName}</p>
                      </div>
                    </div>

                    {/* Expiry - Mobile friendly */}
                    <div className="flex md:block items-center justify-between md:w-32 md:text-center px-3 py-2 md:p-0 rounded-lg bg-white/5 md:bg-transparent">
                      <span className="text-[10px] md:hidden uppercase font-bold text-muted-foreground">Expires</span>
                      <p className="text-sm font-medium">{formatDate(member.endDate)}</p>
                    </div>

                    {/* Outstanding */}
                    <div className="flex md:block items-center justify-between md:w-32 md:text-center px-3 py-2 md:p-0 rounded-lg bg-white/5 md:bg-transparent">
                      <span className="text-[10px] md:hidden uppercase font-bold text-muted-foreground">Due</span>
                      <p className="text-sm font-bold text-danger">{formatCurrency(member.duePaise)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 md:w-48 justify-end">
                      <ReminderWhatsappButton
                        subscriptionId={member.subscriptionId}
                        stage={bucket.stage}
                        whatsappUrl={waUrl}
                        disabled={!member.memberPhone}
                        className="h-9 px-4 text-xs font-bold bg-accent hover:bg-accent/90"
                      >
                        {member.memberPhone ? "SEND" : "NO PHONE"}
                      </ReminderWhatsappButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
