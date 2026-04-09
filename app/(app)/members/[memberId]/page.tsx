import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveMembershipAction,
  freezeSubscriptionAction,
  renewSubscriptionAction,
  updateMemberProfileAction,
} from "@/lib/actions";
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
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { renderReminderTemplate } from "@/lib/utils/reminders";
import { formatCurrency, formatDate } from "@/lib/utils/format";

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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="photoUrl">Photo URL</Label>
                <Input id="photoUrl" name="photoUrl" defaultValue={member.members.photo_url ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={member.members.notes ?? ""} />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <Button type="submit">Update profile</Button>
              </div>
            </form>
            <form action={archiveMembershipAction} className="mt-4">
              <input type="hidden" name="membershipId" value={member.id} />
              <input type="hidden" name="archiveReason" value="Archived from member detail" />
              <Button type="submit" variant="outline">
                Archive member
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription actions</CardTitle>
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
              <div className="space-y-2">
                <Label htmlFor="startDate">Optional start date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <Button type="submit">Renew subscription</Button>
            </form>

            {member.currentSubscription ? (
              <form action={freezeSubscriptionAction} className="grid gap-4">
                <input type="hidden" name="subscriptionId" value={member.currentSubscription.subscription_id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="freezeStartDate">Freeze start</Label>
                    <Input id="freezeStartDate" name="freezeStartDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freezeEndDate">Freeze end</Label>
                    <Input id="freezeEndDate" name="freezeEndDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input id="reason" name="reason" placeholder="Out of town" />
                </div>
                <Button type="submit" variant="outline">
                  Freeze subscription
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.invoices.map((invoice) => (
              <div key={invoice.invoice_id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <p className="font-medium">{invoice.invoice_number}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(invoice.total_amount_paise)} - Due {formatCurrency(invoice.amount_due_paise)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{formatCurrency(payment.amount_paise)}</p>
                  <Button asChild variant="ghost" size="sm" className="px-0">
                    <Link href={`/api/receipts/${payment.id}`}>Receipt PDF</Link>
                  </Button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(payment.received_on)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.attendance.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <p className="font-medium">{formatDate(entry.check_in_date)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Manual check-in</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
