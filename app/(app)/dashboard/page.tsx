import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  BellRing, 
  CreditCard, 
  Plus, 
  UsersRound, 
  CheckCircle2, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Smartphone,
  Banknote,
  Search,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { markAttendanceAction } from "@/lib/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSessionContext } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/db/queries";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { MemberSearchSelect } from "@/components/shared/member-search-select";
import { cn } from "@/lib/utils/cn";
import { format, subDays, startOfMonth, isSameDay, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const dashboard = await getDashboardData(session.gym.id, session.settings?.expiring_warning_days ?? 7);

  // IST Date & Greeting Logic
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hour = istNow.getHours();
  
  const ownerName = session.user?.user_metadata?.full_name?.split(" ")[0] || session.gym.name;
  
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 17) greeting = "Good afternoon";

  const datePill = format(istNow, "EEE, MMM dd");
  const todayStr = format(istNow, "yyyy-MM-dd");

  const checkinDelta = dashboard.checkinsToday - dashboard.checkinsYesterday;
  
  // Pending Reminders Logic
  const unremindedExpiringCount = dashboard.expiringThisWeek.filter(r => {
    const sub = r.currentSubscription;
    return !sub?.reminder_1_sent_at && !sub?.reminder_3_sent_at && !sub?.reminder_5_sent_at;
  }).length;

  // ZONE 3 KPI logic
  const monthStartISO = startOfMonth(istNow).toISOString();
  const newMembersThisMonth = dashboard.records.filter(r => r.members.joined_on && r.members.joined_on >= monthStartISO).length;
  
  const lastMonthRevenue = dashboard.monthlyBreakdown.length >= 2 
    ? dashboard.monthlyBreakdown[dashboard.monthlyBreakdown.length - 2].revenue 
    : 0;
  const revenueGrowth = lastMonthRevenue > 0 
    ? ((dashboard.monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 100;

  // ZONE 5 (Needs Attention) Logic
  const lapsedUnpaid = dashboard.records
    .filter(r => r.status === "lapsed" && r.duePaise > 0)
    .sort((a, b) => b.duePaise - a.duePaise);
  
  const urgentExpiring = dashboard.records
    .filter(r => r.status === "expiring_soon" && r.duePaise > 0)
    .map(r => {
       const endDate = r.currentSubscription?.effective_end_date ? parseISO(r.currentSubscription.effective_end_date) : null;
       const diff = endDate ? Math.ceil((endDate.getTime() - istNow.getTime()) / (1000 * 60 * 60 * 24)) : 99;
       return { ...r, daysLeft: diff };
    })
    .filter(r => r.daysLeft >= 0 && r.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-28">
      {/* ZONE 0 — LOW BALANCE ALERT */}
      {dashboard.whatsappMode === "auto" && dashboard.whatsappBalance < 2000 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/20 p-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Auto reminders paused</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed font-medium">
                Credits low ({formatCurrency(dashboard.whatsappBalance)} remaining). Add credits to resume.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-amber-500 text-white border-none hover:bg-amber-600 rounded-xl h-10 px-5 font-bold shadow-glow shrink-0 ml-4">
            <Link href="/settings/whatsapp">Add Credits</Link>
          </Button>
        </div>
      )}

      {/* ZONE 1 — HEADER */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[13px] text-muted-foreground">{greeting}</p>
          <h1 className="text-[20px] font-medium tracking-tight">{session.gym.name}</h1>
        </div>
        <div className="rounded-full bg-secondary border border-border px-4 py-1.5 text-xs font-medium">
          {datePill}
        </div>
      </div>

      {/* ZONE 2 — TODAY'S PULSE BAR */}
      <Card className="overflow-hidden border-border bg-surface shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
          <div className="p-4 flex flex-col items-center text-center">
            <p className="text-[22px] font-mono font-bold leading-tight">{dashboard.checkinsToday}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 whitespace-nowrap">Check-ins</p>
            <p className={cn("text-[10px] font-medium mt-0.5", checkinDelta >= 0 ? "text-emerald-500" : "text-red-500")}>
              {checkinDelta >= 0 ? "+" : ""}{checkinDelta} vs yesterday
            </p>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <p className="text-[22px] font-mono font-bold leading-tight">₹{Math.floor(dashboard.collectedToday/100)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Collected</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Today</p>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <p className="text-[22px] font-mono font-bold leading-tight">{dashboard.renewalsToday}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Renewals</p>
            <p className="text-[10px] text-amber-500 font-medium mt-0.5">{unremindedExpiringCount} pending</p>
          </div>
        </div>
      </Card>

      {/* ZONE 3 — KPI GRID */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 1 — Active Members */}
        <div className="relative rounded-2xl bg-secondary border border-border p-4 shadow-sm">
          <p className="text-[13px] text-muted-foreground">Active Members</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[22px] font-mono font-bold">{dashboard.activeMembersCount}</span>
            <span className="text-[11px] text-emerald-500 font-medium">+{newMembersThisMonth} this mo</span>
          </div>
        </div>

        {/* Card 2 — Monthly Revenue */}
        <div className="relative rounded-2xl bg-secondary border border-border p-4 shadow-sm">
          <p className="text-[13px] text-muted-foreground">Monthly Revenue</p>
          <div className="mt-2 flex flex-col">
            <span className="text-[22px] font-mono font-bold truncate">₹{Math.floor(dashboard.monthlyRevenue/100).toLocaleString()}</span>
            <span className={cn("text-[11px] font-medium", revenueGrowth >= 0 ? "text-emerald-500" : "text-red-500")}>
              {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth.toFixed(1)}% vs LY
            </span>
          </div>
        </div>

        {/* Card 3 — Pending Dues (RED ALERT) */}
        <div className="relative rounded-2xl bg-secondary border border-border p-4 shadow-sm">
          {dashboard.pendingDueAmount > 500000 && (
            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          )}
          <p className="text-[13px] text-muted-foreground">Pending Dues</p>
          <div className="mt-2 flex flex-col">
            <span className="text-[22px] font-mono font-bold text-red-500 truncate">₹{Math.floor(dashboard.pendingDueAmount/100).toLocaleString()}</span>
            <span className="text-[11px] text-red-500 font-medium">{dashboard.records.filter(r => r.duePaise > 0).length} members</span>
          </div>
        </div>

        {/* Card 4 — Expiring Soon (AMBER ALERT) */}
        <div className="relative rounded-2xl bg-secondary border border-border p-4 shadow-sm">
          {unremindedExpiringCount > 0 && (
            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          )}
          <p className="text-[13px] text-muted-foreground">Expiring Soon</p>
          <div className="mt-2 flex flex-col">
            <span className="text-[22px] font-mono font-bold text-amber-500 truncate">{dashboard.expiringThisWeek.length}</span>
            <span className="text-[11px] text-amber-500 font-medium">{unremindedExpiringCount} not reminded</span>
          </div>
        </div>
      </div>

      {/* ZONE 4 — QUICK CHECK-IN */}
      <div className="space-y-3">
        <p className="text-sm font-medium px-1">Quick check-in</p>
        <form action={markAttendanceAction} className="flex gap-2">
          <div className="flex-1 min-w-0">
             <MemberSearchSelect
                name="membershipId"
                memberships={dashboard.memberships.map((m) => ({
                  id: m.id,
                  label: `${m.members.full_name} (${m.members.phone})`,
                }))}
              />
              <input type="hidden" name="checkInDate" value={todayStr} />
          </div>
          <Button type="submit" className="h-[48px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-glow shrink-0">
            Check In
          </Button>
        </form>
      </div>

      {/* ZONE 5 — NEEDS ATTENTION */}
      {(lapsedUnpaid.length > 0 || urgentExpiring.length > 0) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium">Needs attention</p>
            <Link href="/reminders" className="text-xs text-accent">See all →</Link>
          </div>
          
          <div className="grid gap-3">
            {/* Lapsed Card */}
            {lapsedUnpaid.length > 0 && (
              <div className="rounded-2xl border border-[#F09595] bg-[#FCEBEB] dark:bg-red-950/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-red-900 dark:text-red-400">Lapsed — unpaid</p>
                  <p className="text-xs font-mono font-bold text-red-700 dark:text-red-500">{lapsedUnpaid.length} members · {formatCurrency(lapsedUnpaid.reduce((s, r) => s + r.duePaise, 0))}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lapsedUnpaid.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 border border-red-200 dark:border-red-900/50 px-2.5 py-1 text-xs">
                      <div className="h-4 w-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-[8px] font-bold text-red-600">
                        {getInitials(m.members.full_name)}
                      </div>
                      <span className="font-medium">{m.members.full_name.split(" ")[0]} {m.members.full_name.split(" ").slice(-1)[0][0]}.</span>
                    </div>
                  ))}
                  {lapsedUnpaid.length > 3 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">+ {lapsedUnpaid.length - 3} more</div>
                  )}
                </div>
                <Button asChild variant="ghost" size="sm" className="h-9 w-full border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-bold hover:bg-red-100/50">
                  <Link href="/reminders">Send WhatsApp to all →</Link>
                </Button>
              </div>
            )}

            {/* Expiring Soon Card */}
            {urgentExpiring.length > 0 && (
              <div className="rounded-2xl border border-[#FAC775] bg-[#FAEEDA] dark:bg-amber-950/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-400">Expiring in 1–3 days</p>
                  <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-500">{urgentExpiring.length} members</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {urgentExpiring.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 text-xs">
                      <div className="h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-[8px] font-bold text-amber-600">
                        {getInitials(m.members.full_name)}
                      </div>
                      <span className="font-medium">{m.members.full_name.split(" ")[0]} {m.members.full_name.split(" ").slice(-1)[0][0]}. — {m.daysLeft}d</span>
                    </div>
                  ))}
                  {urgentExpiring.length > 3 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">+ {urgentExpiring.length - 3} more</div>
                  )}
                </div>
                <Button asChild variant="ghost" size="sm" className="h-9 w-full border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-100/50">
                  <Link href="/reminders">Go to Reminders →</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/10 p-5 text-center flex flex-col items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <p className="font-medium text-emerald-900 dark:text-emerald-400">All clear! No urgent actions today.</p>
        </div>
      )}

      {/* ZONE 6 — RECENT ACTIVITY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium">Recent activity</p>
          <Link href="/attendance" className="text-xs text-accent">View all →</Link>
        </div>
        
        <Card className="border-border bg-surface shadow-sm overflow-hidden">
          <div className="divide-y divide-white/[0.05]">
            {dashboard.recentActivity.map((activity, idx) => {
              const Icon = activity.type === "payment" ? CreditCard : activity.type === "attendance" ? Zap : BellRing;
              const iconColor = activity.type === "payment" ? "text-emerald-500" : activity.type === "attendance" ? "text-blue-500" : "text-amber-500";
              const bgColor = activity.type === "payment" ? "bg-emerald-500/10" : activity.type === "attendance" ? "bg-blue-500/10" : "bg-amber-500/10";
              
              const initials = activity.title.split(" ").slice(-1)[0].slice(0, 1); // rough member detection
              
              return (
                <div key={`${activity.type}-${activity.id}`} className="p-4 flex items-center gap-4">
                  <div className={cn("h-10 w-10 shrink-0 rounded-full flex items-center justify-center", bgColor)}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                       {activity.title.includes("Payment") ? activity.title.split(" recorded")[0] : 
                        activity.title.includes("Attendance") ? "Attendance marked" : 
                        activity.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground truncate">
                       {activity.type === "payment" ? `Payment recorded · ${activity.body.includes("Ref") ? "UPI/Card" : "Cash"}` :
                        activity.type === "attendance" ? `Checked in · Biometric/Manual` :
                        `Reminder sent · ${activity.body}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-[11px] text-muted-foreground">{formatDate(activity.created_at, "hh:mm a")}</p>
                    {activity.type === "payment" && (
                      <p className="text-[11px] font-mono font-bold text-emerald-500">
                         +{activity.title.split("Payment of ")[1]?.split(" recorded")[0]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
