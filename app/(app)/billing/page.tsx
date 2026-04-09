import Link from "next/link";
import { applyCreditAction, correctInvoiceAction, recordPaymentAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getBillingPageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { membershipId?: string };
}) {
  const session = await getSessionContext();
  const data = await getBillingPageData(session.gym!.id);
  const membershipLookup = new Map(data.memberships.map((membership) => [membership.id, membership]));
  const selectedMembershipId = searchParams.membershipId ?? data.memberships[0]?.id;
  const openInvoices = data.invoices.filter((invoice) => invoice.derived_status !== "paid" && invoice.derived_status !== "voided");
  const selectedInvoices = openInvoices.filter((invoice) => invoice.membership_id === selectedMembershipId);

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Record payments, track dues, apply credit, and keep invoices clean." />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordPaymentAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="membershipId">Membership</Label>
                <select
                  id="membershipId"
                  name="membershipId"
                  defaultValue={selectedMembershipId}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {data.memberships.map((membership) => (
                    <option key={membership.id} value={membership.id}>
                      {membership.members.full_name} ({membership.members.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amountRupees">Amount received (INR)</Label>
                  <Input id="amountRupees" name="amountRupees" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receivedOn">Received on</Label>
                  <Input id="receivedOn" name="receivedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <select
                    id="method"
                    name="method"
                    defaultValue="upi"
                    className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceCode">Reference</Label>
                  <Input id="referenceCode" name="referenceCode" placeholder="UTR / note" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="allocationInvoiceId">Invoice</Label>
                  <select
                    id="allocationInvoiceId"
                    name="allocationInvoiceId"
                    defaultValue={selectedInvoices[0]?.invoice_id ?? ""}
                    className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <option value="">Leave unallocated and create credit</option>
                    {selectedInvoices.map((invoice) => (
                      <option key={invoice.invoice_id} value={invoice.invoice_id}>
                        {invoice.invoice_number} - Due {formatCurrency(invoice.amount_due_paise)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allocationAmountRupees">Allocate amount (INR)</Label>
                  <Input
                    id="allocationAmountRupees"
                    name="allocationAmountRupees"
                    type="number"
                    step="0.01"
                    defaultValue={selectedInvoices[0] ? selectedInvoices[0].amount_due_paise / 100 : ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" placeholder="Optional payment note" />
              </div>
              <Button type="submit">Record payment</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apply credit</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={applyCreditAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditMembershipId">Membership</Label>
                <select
                  id="creditMembershipId"
                  name="membershipId"
                  defaultValue={selectedMembershipId}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {data.memberships.map((membership) => (
                    <option key={membership.id} value={membership.id}>
                      {membership.members.full_name} ({membership.members.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceId">Invoice</Label>
                <select
                  id="invoiceId"
                  name="invoiceId"
                  defaultValue={selectedInvoices[0]?.invoice_id ?? ""}
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {selectedInvoices.map((invoice) => (
                    <option key={invoice.invoice_id} value={invoice.invoice_id}>
                      {invoice.invoice_number} - Due {formatCurrency(invoice.amount_due_paise)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditAmount">Amount to apply (INR)</Label>
                <Input id="creditAmount" name="amountRupees" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditNote">Note</Label>
                <Input id="creditNote" name="note" placeholder="Applied from membership credit" />
              </div>
              <Button type="submit" variant="outline">
                Apply credit
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {session.gymUser?.role === "owner" ? (
        <Card>
          <CardHeader>
            <CardTitle>Invoice correction</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={correctInvoiceAction} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="invoiceToCorrect">Original invoice</Label>
                <select
                  id="invoiceToCorrect"
                  name="invoiceId"
                  required
                  className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {data.invoices
                    .filter((invoice) => invoice.derived_status !== "voided")
                    .map((invoice) => (
                      <option key={invoice.invoice_id} value={invoice.invoice_id}>
                        {invoice.invoice_number} - {formatCurrency(invoice.total_amount_paise)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="replacementAmountRupees">Replacement amount (INR)</Label>
                <Input id="replacementAmountRupees" name="replacementAmountRupees" type="number" step="0.01" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" placeholder="Wrong amount entered" required />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Replacement invoice created after manual correction" />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" variant="outline">
                  Correct invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Open invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openInvoices.map((invoice) => {
              const membership = membershipLookup.get(invoice.membership_id);

              return (
                <div key={invoice.invoice_id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Issued {formatDate(invoice.issued_on)} - {invoice.reason.replaceAll("_", " ")}
                      </p>
                    </div>
                    <Badge variant={invoice.derived_status === "partially_paid" ? "warning" : "danger"}>
                      {invoice.derived_status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Total {formatCurrency(invoice.total_amount_paise)}</span>
                    <span>Due {formatCurrency(invoice.amount_due_paise)}</span>
                    {membership ? (
                      <Button asChild variant="ghost" size="sm" className="px-0">
                        <Link href={`/members/${membership.member_id}`}>Open member</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership credit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.credits.map((credit) => {
              const membership = membershipLookup.get(credit.membership_id);

              return (
                <div key={credit.membership_id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                  <p className="text-sm font-medium">{membership?.members.full_name ?? credit.membership_id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Available credit</p>
                  <p className="mt-3 text-xl font-semibold">{formatCurrency(credit.credit_balance_paise)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
