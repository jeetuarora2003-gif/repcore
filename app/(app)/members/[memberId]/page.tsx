import Link from "next/link";
import { notFound } from "next/navigation";
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
import { BodyMeasurementForm } from "@/components/members/body-measurement-form";
import { DigitalIdCard } from "@/components/members/digital-id-card";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { renderReminderTemplate } from "@/lib/utils/reminders";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { QrCode, Share2 } from "lucide-react";

export default async function MemberDetailPage({
  params,
}: {
  params: { memberId: string };
}) {
  const session = await getSessionContext();
  const [member, plans, templates] = await Promise.all([
    getMemberDetailData(session.gym!.id, params.memberId, session.settings?.expiring_warning_days ?? 7),
    getMembershipPlans(session.gym!.id),
    getReminderTemplates(session.gym!.id),
  ]);

  if (!member) notFound();

  const expiryTemplate =
    templates.find((template) => template.template_type === "membership_expiry")?.body ??
    "Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]";

  const message = renderReminderTemplate(expiryTemplate, {
    name: member.members.full_name,
    gymName: session.gym!.name,
    phone: session.gym!.phone,
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
          <TabsTrigger value="progress" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Existing Profile Card */}
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
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      name="gender"
                      defaultValue={member.members.gender ?? ""}
                      className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
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
                                    gymName: session.gym!.name,
                                    gymLogo: session.gym!.logo_url
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

        <TabsContent value="progress" className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Fitness Journey</CardTitle>
                    <p className="text-sm text-muted-foreground">Log and track body measurements over time.</p>
                </CardHeader>
                <CardContent className="space-y-8">
                    <BodyMeasurementForm membershipId={member.id} />
                    
                    {member.bodyLogs.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Progress</h3>
                            <div className="overflow-x-auto rounded-3xl border border-border">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/[0.03] text-muted-foreground font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Weight</th>
                                            <th className="px-4 py-3">Fat %</th>
                                            <th className="px-4 py-3">Biceps</th>
                                            <th className="px-4 py-3">Waist</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {member.bodyLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-4 font-medium">{formatDate(log.recorded_on)}</td>
                                                <td className="px-4 py-4">{log.weight_kg ?? "-"} kg</td>
                                                <td className="px-4 py-4">{log.body_fat_percentage ?? "-"} %</td>
                                                <td className="px-4 py-4">{log.biceps_cm ?? "-"} cm</td>
                                                <td className="px-4 py-4">{log.waist_cm ?? "-"} cm</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
