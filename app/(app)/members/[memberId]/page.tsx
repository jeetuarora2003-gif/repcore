import Link from "next/link";
import { notFound } from "next/navigation";
import {
  freezeSubscriptionAction,
  renewSubscriptionAction,
  updateMemberProfileAction,
  recordPaymentAction,
  applyCreditAction,
  correctInvoiceAction,
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
    templates.find((t) => t.template_type === "membership_expiry")?.body ??
    "Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]";

  const message = renderReminderTemplate(expiryTemplate, {
    name: member.members.full_name,
    gymName: session.gym!.name,
    phone: session.gym!.phone,
    date: member.currentSubscription?.effective_end_date,
  });
  const whatsappUrl = buildWhatsAppUrl(member.members.phone, message);

  // Helpers for billing tab
  const openInvoices = member.invoices.filter((i) => i.amount_due_paise > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.members.full_name}
        description={`${member.members.phone} — ${member.status.replaceAll("_", " ")}`}
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

        {/* ─────────────────────── OVERVIEW TAB ─────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Profile edit card */}
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
              {/* Digital ID card */}
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
                        gymLogo: session.gym!.logo_url,
                      }}
                    />
                  </div>
                  <div className="grid gap-3 p-2 max-w-sm mx-auto">
                    <Button asChild className="h-12 rounded-2xl bg-accent hover:bg-accent/90">
                      <a href={`/id/${member.id}`} target="_blank" rel="noopener noreferrer">
                        <Share2 className="mr-2 h-4 w-4" />
                        Preview &amp; Share ID Card
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance preview */}
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
                  {member.attendance.length === 0 && (
                    <p className="text-sm text-muted-foreground">No attendance logged yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─────────────────────── BILLING TAB ─────────────────────── */}
        <TabsContent value="billing" className="space-y-6 mt-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

            {/* ── Left column ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {member.currentSubscription?.plan_snapshot_name ?? "No active plan"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.currentSubscription
                            ? `Ends ${formatDate(member.currentSubscription.effective_end_date)}`
                            : "No live subscription"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          member.status === "expired"
                            ? "danger"
                            : member.status === "expiring_soon"
                            ? "warning"
                            : "success"
                        }
                      >
                        {member.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  <form action={renewSubscriptionAction} className="grid gap-4">
                    <input type="hidden" name="membershipId" value={member.id} />
                    <div className="space-y-2">
                      <Label htmlFor="renewPlanId">Renew with plan</Label>
                      <select
                        id="renewPlanId"
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

              <Card>
                <CardHeader>
                  <CardTitle>Record Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={recordPaymentAction} className="grid gap-4">
                    <input type="hidden" name="membershipId" value={member.id} />
                    <div className="space-y-2">
                      <Label htmlFor="amountRupees">Amount (₹)</Label>
                      <Input id="amountRupees" name="amountRupees" type="number" min="1" required />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="method">Method</Label>
                        <select
                          id="method"
                          name="method"
                          defaultValue="cash"
                          className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="receivedOn">Date</Label>
                        <Input
                          id="receivedOn"
                          name="receivedOn"
                          type="date"
                          required
                          defaultValue={new Date().toISOString().slice(0, 10)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payNote">Notes / Reference</Label>
                      <Input id="payNote" name="note" placeholder="Transaction ID or notes" />
                    </div>
                    <Button type="submit">Record payment</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {member.invoices.map((inv) => (
                    <div
                      key={inv.invoice_id}
                      className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{inv.invoice_number}</p>
                        <Badge variant={inv.amount_due_paise > 0 ? "danger" : "success"}>
                          {inv.amount_due_paise > 0 ? `Due ${formatCurrency(inv.amount_due_paise)}` : "Paid"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Total {formatCurrency(inv.total_amount_paise)} · {formatDate(inv.issued_on)}
                      </p>
                    </div>
                  ))}
                  {member.invoices.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">No invoices found.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Apply Credit</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={applyCreditAction} className="space-y-4">
                    <input type="hidden" name="membershipId" value={member.id} />
                    <div className="space-y-2">
                      <Label htmlFor="creditInvoiceId">Invoice</Label>
                      <select
                        id="creditInvoiceId"
                        name="invoiceId"
                        defaultValue={openInvoices[0]?.invoice_id ?? ""}
                        required
                        className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {openInvoices.map((inv) => (
                          <option key={inv.invoice_id} value={inv.invoice_id}>
                            {inv.invoice_number} — Due {formatCurrency(inv.amount_due_paise)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditAmount">Amount to apply (₹)</Label>
                      <Input id="creditAmount" name="amountRupees" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditNote">Note</Label>
                      <Input id="creditNote" name="note" placeholder="Applied from membership credit" />
                    </div>
                    <Button type="submit" variant="outline" size="sm">Apply credit</Button>
                  </form>
                </CardContent>
              </Card>

              {session.gymUser?.role === "owner" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Correction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={correctInvoiceAction} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoiceToCorrect">Original invoice</Label>
                        <select
                          id="invoiceToCorrect"
                          name="invoiceId"
                          required
                          className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {member.invoices
                            .filter((i) => i.derived_status !== "voided")
                            .map((inv) => (
                              <option key={inv.invoice_id} value={inv.invoice_id}>
                                {inv.invoice_number} — {formatCurrency(inv.total_amount_paise)}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="replacementAmountRupees">Replacement amount (₹)</Label>
                        <Input
                          id="replacementAmountRupees"
                          name="replacementAmountRupees"
                          type="number"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="correctionReason">Reason</Label>
                        <Input
                          id="correctionReason"
                          name="reason"
                          placeholder="Wrong amount entered"
                          required
                        />
                      </div>
                      <Button type="submit" variant="outline" size="sm">Correct invoice</Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {member.payments.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{formatCurrency(p.amount_paise)}</p>
                        <p className="text-muted-foreground">{formatDate(p.received_on)}</p>
                      </div>
                    </div>
                  ))}
                  {member.payments.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">No payments recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─────────────────────── ACTIVITY TAB ─────────────────────── */}
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
                  member.messages.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                      <p className="font-medium">{log.channel.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatDate(log.created_at, "dd MMM, hh:mm a")}
                      </p>
                      <p className="mt-3 line-clamp-3 text-foreground/90">{log.rendered_body}</p>
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
