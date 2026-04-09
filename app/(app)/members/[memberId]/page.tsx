import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  freezeSubscriptionAction,
  renewSubscriptionAction,
  updateMemberProfileAction,
} from "@/lib/actions";
import { ArchiveMemberButton } from "@/components/members/archive-member-button";
import { getSessionContext } from "@/lib/auth/session";
import { getMemberDetailData, getMembershipPlans, getReminderTemplates } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/shared/image-upload";
import { DigitalIdCard } from "@/components/members/digital-id-card";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { renderReminderTemplate } from "@/lib/utils/reminders";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { QrCode, Share2 } from "lucide-react";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const { memberId } = await params;

  const [member, plans, templates] = await Promise.all([
    getMemberDetailData(session.gym.id, memberId, session.settings?.expiring_warning_days ?? 7),
    getMembershipPlans(session.gym.id),
    getReminderTemplates(session.gym.id),
  ]);

  if (!member) notFound();

  const expiryTemplate =
    templates.find((template) => template.template_type === "membership_expiry")?.body ??
    "Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]";

  const message = renderReminderTemplate(expiryTemplate, {
    name: member.members.full_name,
    gymName: session.gym.name,
    phone: session.gym.phone,
    date: member.currentSubscription?.effective_end_date,
  });
  const whatsappUrl = buildWhatsAppUrl(member.members.phone, message);

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.members.full_name}
        description={`${member.members.phone} - ${member.status.replaceAll("_", " ")}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/billing?membershipId=${member.id}`}>Collect fee</Link>
            </Button>
            <WhatsappButton
              membershipId={member.id}
              subscriptionId={member.currentSubscription?.subscription_id}
              recipientPhone={member.members.phone}
              renderedBody={message}
              whatsappUrl={whatsappUrl}
            >
              Remind on WhatsApp
            </WhatsappButton>
          </>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white/[0.03] p-1 h-12">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Overview</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Billing</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateMemberProfileAction} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="memberId" value={member.member_id} />
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Name</Label>
                    <Input id="fullName" name="fullName" defaultValue={member.members.full_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={member.members.phone} required />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUpload 
                      bucket="member_photos" 
                      name="photoUrl" 
                      label="Member Photo" 
                      defaultValue={member.members.photo_url ?? ""} 
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" defaultValue={member.members.notes ?? ""} />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-3">
                    <Button type="submit">Update profile</Button>
                  </div>
                </form>
                <div className="mt-4">
                  <ArchiveMemberButton membershipId={member.id} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className="panel bg-[#050505] overflow-hidden border-none shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-accent" />
                            Digital Identity Card
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-center scale-90 sm:scale-100 origin-top">
                            <DigitalIdCard 
                                member={{
                                    fullName: member.members.full_name,
                                    photoUrl: member.members.photo_url,
                                    status: member.status,
                                    expiresAt: member.currentSubscription?.effective_end_date,
                                    gymName: session.gym.name,
                                    gymLogo: session.gym.logo_url
                                }} 
                            />
                        </div>
                        
                        <div className="grid gap-3 p-2 max-w-sm mx-auto">
                            <Button asChild className="h-12 rounded-2xl bg-accent hover:bg-accent/90">
                                <a href={`/id/${member.id}`} target="_blank" rel="noopener noreferrer">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Preview & Share ID Card
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Attendance History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {member.attendance.slice(0, 5).map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                                <p className="font-medium">{formatDate(entry.check_in_date)}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Subscriptions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                            <p className="font-medium">{member.currentSubscription?.plan_snapshot_name ?? "No active plan"}</p>
                            <p className="text-sm text-muted-foreground">
                                {member.currentSubscription ? `Ends ${formatDate(member.currentSubscription.effective_end_date)}` : "No live subscription"}
                            </p>
                            </div>
                            <Badge variant={member.status === "expired" ? "danger" : member.status === "expiring_soon" ? "warning" : "success"}>
                            {member.status.replaceAll("_", " ")}
                            </Badge>
                        </div>
                        </div>

                        <form action={renewSubscriptionAction} className="grid gap-4">
                            <input type="hidden" name="membershipId" value={member.id} />
                            <div className="space-y-2">
                                <Label htmlFor="planId">Renew with plan</Label>
                                <select
                                id="planId"
                                name="planId"
                                defaultValue={plans[0]?.id ?? ""}
                                required
                                className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                {plans.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                    {plan.name} ({plan.duration_days} days)
                                    </option>
                                ))}
                                </select>
                            </div>
                            <Button type="submit">Renew subscription</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {member.invoices.map((inv) => (
                                <div key={inv.invoice_id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                                    {inv.invoice_number} - Due {formatCurrency(inv.amount_due_paise)}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {member.payments.map((p) => (
                                <div key={p.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                                    {formatCurrency(p.amount_paise)} on {formatDate(p.received_on)}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.attendance.length ? (
                  member.attendance.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                      <p className="font-medium">{formatDate(entry.check_in_date)}</p>
                      <p className="mt-1 text-muted-foreground">
                        Checked in at {formatDate(entry.checked_in_at, "hh:mm a")}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
                    No attendance logged for this member yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reminder history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {member.messages.length ? (
                  member.messages.map((messageLog) => (
                    <div key={messageLog.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                      <p className="font-medium">{messageLog.channel.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-muted-foreground">{formatDate(messageLog.created_at, "dd MMM, hh:mm a")}</p>
                      <p className="mt-3 line-clamp-3 text-foreground/90">{messageLog.rendered_body}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
                    No reminder history recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
