import Link from "next/link";
import { TrendingUp, CreditCard, AlertCircle, FileText } from "lucide-react";
import { applyCreditAction, correctInvoiceAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getBillingPageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { RecordPaymentForm } from "@/components/billing/record-payment-form";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ membershipId?: string }>;
}) {
  const session = await getSessionContext();
  const data = await getBillingPageData(session.gym!.id);
  const { financialOverview } = data;

  const membershipLookup = new Map(data.memberships.map((m) => [m.id, m]));
  const selectedMembershipId = searchParams.membershipId ?? data.memberships[0]?.id;
  const openInvoices = data.invoices.filter(
    (inv) => inv.derived_status !== "paid" && inv.derived_status !== "voided",
  );
  const selectedInvoices = openInvoices.filter((inv) => inv.membership_id === selectedMembershipId);

  // Revenue bar chart values — normalise to 0–100% height
  const maxRevenue = Math.max(...financialOverview.monthlyBreakdown.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Revenue overview, payment collection, and invoice management."
      />

      {/* ── Financial KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={formatCurrency(financialOverview.monthlyRevenue)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="All-time collected"
          value={formatCurrency(financialOverview.totalCollected)}
          icon={CreditCard}
        />
        <StatCard
          label="Pending dues"
          value={formatCurrency(financialOverview.totalPendingDues)}
          icon={AlertCircle}
          tone="danger"
        />
        <StatCard
          label="Open invoices"
          value={`${financialOverview.openInvoiceCount}`}
          icon={FileText}
          tone={financialOverview.openInvoiceCount > 0 ? "warning" : undefined}
        />
      </div>

      {/* ── Revenue Bar Chart (last 6 months, pure CSS) ── */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {financialOverview.monthlyBreakdown.map((item, idx) => {
              const heightPct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              const isCurrentMonth = idx === financialOverview.monthlyBreakdown.length - 1;
              return (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  <div
                    title={formatCurrency(item.revenue)}
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isCurrentMonth
                        ? "bg-accent shadow-[0_0_12px_var(--accent)]"
                        : "bg-accent/30"
                    }`}
                    style={{ height: `${Math.max(heightPct, item.revenue > 0 ? 4 : 0)}%` }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
          {financialOverview.monthlyBreakdown.every((m) => m.revenue === 0) && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              No payments recorded yet. Revenue will appear here once you start collecting fees.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Record Payment + Apply Credit ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordPaymentForm
              memberships={data.memberships}
              invoices={data.invoices as any}
              initialMembershipId={selectedMembershipId}
              gymName={session.gym!.name}
            />
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
                  {data.memberships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.members.full_name} ({m.members.phone})
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
                  {selectedInvoices.map((inv) => (
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
              <Button type="submit" variant="outline">Apply credit</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Invoice Correction (owner only) ── */}
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
                    .filter((inv) => inv.derived_status !== "voided")
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" placeholder="Wrong amount entered" required />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Replacement invoice created after manual correction"
                />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" variant="outline">Correct invoice</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Open Invoices + Credit Balances ── */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Open invoices{" "}
              {openInvoices.length > 0 && (
                <Badge variant="danger" className="ml-2 text-xs">
                  {openInvoices.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openInvoices.length === 0 && (
              <div className="rounded-2xl border border-border bg-white/[0.03] p-6 text-sm text-muted-foreground text-center">
                🎉 All invoices are settled. No outstanding dues.
              </div>
            )}
            {openInvoices.map((invoice) => {
              const membership = membershipLookup.get(invoice.membership_id);
              return (
                <div key={invoice.invoice_id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      {membership && (
                        <p className="text-sm text-muted-foreground truncate">
                          {membership.members.full_name} · {membership.members.phone}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Issued {formatDate(invoice.issued_on)} — {invoice.reason.replaceAll("_", " ")}
                      </p>
                    </div>
                    <Badge
                      variant={invoice.derived_status === "partially_paid" ? "warning" : "danger"}
                      className="shrink-0"
                    >
                      {invoice.derived_status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Total {formatCurrency(invoice.total_amount_paise)}</span>
                    <span className="font-semibold text-foreground">
                      Due {formatCurrency(invoice.amount_due_paise)}
                    </span>
                    {membership ? (
                      <Button asChild variant="ghost" size="sm" className="ml-auto px-0 h-auto">
                        <Link href={`/members/${membership.member_id}?tab=billing`}>
                          Open member →
                        </Link>
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
            {data.credits.length === 0 && (
              <p className="text-sm text-muted-foreground">No available credits.</p>
            )}
            {data.credits.map((credit) => {
              const membership = membershipLookup.get(credit.membership_id);
              return (
                <div
                  key={credit.membership_id}
                  className="rounded-2xl border border-border bg-white/[0.03] p-4"
                >
                  <p className="text-sm font-medium">
                    {membership?.members.full_name ?? credit.membership_id}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Available credit</p>
                  <p className="mt-2 text-xl font-semibold text-accent">
                    {formatCurrency(credit.credit_balance_paise)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
