"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import dynamic from "next/dynamic";
const RecordPaymentForm = dynamic(
  () => import("@/components/billing/record-payment-form").then((mod) => mod.RecordPaymentForm),
  { ssr: false }
);
import { applyCreditAction } from "@/lib/actions";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type BillingClientProps = {
  todayPayments: any[];
  todayCash: number;
  todayUPI: number;
  todayCount: number;
  todayTotal: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  pendingDuesTotal: number;
  openInvoiceCount: number;
  monthlyBreakdown: { month: string; revenue: number }[];
  pendingDuesList: any[];
  memberships: any[];
  invoices: any[];
  gymName: string;
};

export function BillingClient({
  todayPayments,
  todayCash,
  todayUPI,
  todayCount,
  todayTotal,
  thisMonthRevenue,
  lastMonthRevenue,
  pendingDuesTotal,
  openInvoiceCount,
  monthlyBreakdown,
  pendingDuesList,
  memberships,
  invoices,
  gymName,
}: BillingClientProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");

  const maxRevenue = Math.max(...monthlyBreakdown.map((m) => m.revenue), 1);
  const growthPct = lastMonthRevenue > 0 
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 100;
  
  const handleCollect = (membershipId: string) => {
    setSelectedMembershipId(membershipId);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* ZONE 1 — PAGE HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium tracking-tight">Billing</h1>
        <Button 
          onClick={() => handleCollect(memberships[0]?.id || "")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-glow"
        >
          + Record Payment
        </Button>
      </div>

      {/* ZONE 2 — TODAY'S SUMMARY CARD */}
      <div className="rounded-3xl border border-border bg-surface shadow-panel overflow-hidden">
        <div className="p-5 border-b border-white/[0.05]">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Collected today</p>
          <p className="text-4xl font-mono font-bold text-accent">{formatCurrency(todayTotal)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="success" className="bg-emerald-500/10 border border-emerald-500/30">Cash {formatCurrency(todayCash)}</Badge>
            <Badge variant="accent" className="bg-blue-500/10 border border-blue-500/30">UPI {formatCurrency(todayUPI)}</Badge>
            <Badge variant="default" className="bg-white/5 border border-white/10 text-muted-foreground">{todayCount} txns</Badge>
          </div>
        </div>
        <div className="p-4 bg-black/20">
          {todayPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet today.</p>
          ) : (
            <div className="space-y-3">
              {todayPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-[120px] sm:max-w-xs">{p.memberships.members.full_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(p.created_at, "hh:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm",
                      p.method === 'upi' ? "bg-blue-500/20 text-blue-400" :
                      p.method === 'cash' ? "bg-amber-500/20 text-amber-400" :
                      "bg-pink-500/20 text-pink-400"
                    )}>
                      {p.method}
                    </span>
                    <span className="font-mono text-emerald-500 font-medium whitespace-nowrap">+ {formatCurrency(p.amount_paise)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ZONE 3 — KPI ROW + CHART */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-panel">
            <p className="text-sm text-muted-foreground mb-1">This month</p>
            <p className="text-2xl font-mono font-bold">{formatCurrency(thisMonthRevenue)}</p>
            <p className={cn("mt-1 text-xs font-medium", growthPct >= 0 ? "text-emerald-500" : "text-red-500")}>
              {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}% vs last month
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-panel">
            <p className="text-sm text-muted-foreground mb-1">Pending dues</p>
            <p className="text-2xl font-mono font-bold text-red-500">{formatCurrency(pendingDuesTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{openInvoiceCount} open bills</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-panel">
          <div className="flex items-end gap-2 h-32">
            {monthlyBreakdown.map((item, idx) => {
              const heightPct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              const isCurrentMonth = idx === monthlyBreakdown.length - 1;
              return (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  <div
                    title={formatCurrency(item.revenue)}
                    className={cn(
                      "w-full rounded-sm transition-all duration-500 max-w-[40px]",
                      isCurrentMonth ? "bg-[#1D9E75]" : "bg-[#9FE1CB]/30"
                    )}
                    style={{ height: `${Math.max(heightPct, item.revenue > 0 ? 4 : 0)}%` }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ZONE 4 — PENDING DUES LIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">Pending dues</h2>
          <Badge variant="default" className="rounded-full">{pendingDuesList.length} members</Badge>
        </div>

        {pendingDuesList.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="font-medium text-foreground">All dues cleared!</p>
            <p className="text-sm">Great collections this month.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingDuesList.map(item => {
              const outstanding = item.amount_due_paise;
              const credit = item.credit_balance_paise;
              const isPartial = item.derived_status === "partially_paid";
              const partialAmount = item.total_amount_paise - outstanding;
              const isOverdue = item.daysOverdue > 7;
              const netToCollect = Math.max(outstanding - credit, 0);

              return (
                <div key={item.invoice_id} className="rounded-3xl border border-border bg-surface p-4 shadow-panel space-y-4">
                  {/* TOP ROW */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={item.member_name} photoUrl={item.photo_url} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium truncate">{item.member_name}</p>
                        <p className="text-[12px] text-muted-foreground truncate">{item.reason}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-red-500 font-bold">{formatCurrency(outstanding)}</p>
                    </div>
                  </div>

                  {/* MIDDLE ROW */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <p className="text-muted-foreground">Due since {formatDate(item.issued_on, "MMM dd")}</p>
                    {credit > 0 ? (
                      <Badge variant="success" className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
                        {formatCurrency(credit)} credit available
                      </Badge>
                    ) : isPartial ? (
                      <span className="text-amber-500 font-medium">Partial: {formatCurrency(partialAmount)} paid</span>
                    ) : isOverdue ? (
                      <span className="text-red-500 font-medium">{item.daysOverdue} days overdue</span>
                    ) : item.daysOverdue === 0 ? (
                      <span className="text-amber-500 font-medium">Due today</span>
                    ) : null}
                  </div>

                  {/* BOTTOM ROW (ACTIONS) */}
                  <div className="flex items-center gap-2 pt-1">
                    {credit >= outstanding ? (
                      <>
                        <form action={applyCreditAction} className="flex-1">
                          <input type="hidden" name="membershipId" value={item.membership_id} />
                          <input type="hidden" name="invoiceId" value={item.invoice_id} />
                          <input type="hidden" name="amountRupees" value={outstanding / 100} />
                          <input type="hidden" name="note" value="Auto-applied full credit from Billing dashboard" />
                          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                            Apply Credit
                          </Button>
                        </form>
                      </>
                    ) : credit > 0 ? (
                      <>
                        <Button 
                          onClick={() => handleCollect(item.membership_id)}
                          className="flex-1 rounded-xl bg-accent text-white"
                        >
                          Collect {formatCurrency(netToCollect)}
                        </Button>
                        <form action={applyCreditAction} className="flex-1">
                          <input type="hidden" name="membershipId" value={item.membership_id} />
                          <input type="hidden" name="invoiceId" value={item.invoice_id} />
                          <input type="hidden" name="amountRupees" value={credit / 100} />
                          <input type="hidden" name="note" value="Auto-applied partial credit from Billing dashboard" />
                          <Button type="submit" variant="outline" className="w-full rounded-xl">
                            Apply {formatCurrency(credit)}
                          </Button>
                        </form>
                      </>
                    ) : (
                      <>
                        <Button 
                          onClick={() => handleCollect(item.membership_id)}
                          className="flex-1 border-2 border-accent bg-transparent text-accent hover:bg-accent hover:text-white rounded-xl"
                        >
                          Collect {formatCurrency(outstanding)}
                        </Button>
                        <Button asChild variant="outline" className="flex-1 rounded-xl">
                          <Link href={`/members/${item.member_id}?tab=billing`}>View Invoice</Link>
                        </Button>
                      </>
                    )}
                    {credit >= outstanding && (
                      <Button asChild variant="outline" className="flex-1 rounded-xl">
                        <Link href={`/members/${item.member_id}?tab=billing`}>View Invoice</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh] overflow-y-auto p-6 bottom-0 translate-y-0 top-auto sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto rounded-t-3xl sm:rounded-3xl border-b-0 border-x-0 sm:border !mb-0 rounded-b-none transition-transform duration-300">
          <DialogHeader className="mb-4">
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription className="sr-only">Record a new payment</DialogDescription>
          </DialogHeader>
          <div className="pb-8">
            <RecordPaymentForm 
              memberships={memberships}
              invoices={invoices}
              initialMembershipId={selectedMembershipId}
              gymName={gymName}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
