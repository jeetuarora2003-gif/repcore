import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getBillingPageData } from "@/lib/db/queries";
import { BillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const data = await getBillingPageData(session.gym.id);
  const { financialOverview, payments, invoices, credits, memberships } = data;

  // Calculate IST today at midnight
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const todayIST = new Date(istString);
  const todayISTStart = new Date(
    todayIST.getFullYear(),
    todayIST.getMonth(),
    todayIST.getDate()
  ).getTime();

  // Process today's payments
  let todayCash = 0;
  let todayUPI = 0;
  const todayPaymentsRaw = [];

  for (const p of payments) {
    const pDate = new Date(p.created_at);
    // Rough estimation strategy: toLocaleString it
    const pIstString = pDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const pIstDate = new Date(pIstString);
    const pIstTime = new Date(
      pIstDate.getFullYear(),
      pIstDate.getMonth(),
      pIstDate.getDate()
    ).getTime();

    if (pIstTime === todayISTStart) {
      if (p.method === "cash") todayCash += p.amount_paise;
      if (p.method === "upi") todayUPI += p.amount_paise;
      
      const membership = memberships.find(m => m.id === p.membership_id);
      if (membership) {
        todayPaymentsRaw.push({
          ...p,
          memberships: membership
        });
      }
    }
  }

  const todayCount = todayPaymentsRaw.length;
  const todayTotal = todayPaymentsRaw.reduce((acc, p) => acc + p.amount_paise, 0);

  // Last 3 rows for feed
  const sortedTodayPayments = todayPaymentsRaw.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);

  // Build pending dues list
  const openInvoices = invoices.filter(
    (inv) => inv.derived_status !== "paid" && inv.derived_status !== "voided"
  );
  
  const nowUtcTime = new Date().getTime();

  const pendingDuesList = openInvoices.map((inv) => {
    const membership = memberships.find((m) => m.id === inv.membership_id);
    const creditRec = credits.find((c) => c.membership_id === inv.membership_id);
    const credit_balance_paise = creditRec?.credit_balance_paise || 0;

    const issuedTime = new Date(inv.issued_on).getTime();
    const daysOverdue = Math.max(0, Math.floor((nowUtcTime - issuedTime) / (1000 * 60 * 60 * 24)));

    return {
      ...inv,
      member_name: membership?.members?.full_name || "Unknown",
      photo_url: membership?.members?.photo_url || null,
      member_id: membership?.member_id || "",
      daysOverdue,
      credit_balance_paise,
    };
  }).sort((a, b) => b.amount_due_paise - a.amount_due_paise); // sort by highest owes first

  // Previous month revenue logic
  let lastMonthRevenue = 0;
  if (financialOverview.monthlyBreakdown.length >= 2) {
    lastMonthRevenue = financialOverview.monthlyBreakdown[financialOverview.monthlyBreakdown.length - 2].revenue;
  }

  // Calculate total available credit across all members
  const totalAvailableCredit = credits.reduce((acc, c) => acc + (c.credit_balance_paise || 0), 0);

  return (
    <BillingClient
      todayPayments={sortedTodayPayments}
      todayCash={todayCash}
      todayUPI={todayUPI}
      todayCount={todayCount}
      todayTotal={todayTotal}
      thisMonthRevenue={financialOverview.monthlyRevenue}
      lastMonthRevenue={lastMonthRevenue}
      pendingDuesTotal={financialOverview.totalPendingDues}
      openInvoiceCount={financialOverview.openInvoiceCount}
      totalAvailableCredit={totalAvailableCredit}
      monthlyBreakdown={financialOverview.monthlyBreakdown}
      pendingDuesList={pendingDuesList}
      memberships={memberships}
      invoices={invoices}
      gymName={session.gym.name}
    />
  );
}
