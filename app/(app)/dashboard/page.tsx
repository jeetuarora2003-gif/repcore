import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CreditCard, Plus, UsersRound } from "lucide-react";
import { markAttendanceAction } from "@/lib/actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/db/queries";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ConversionBanners } from "@/components/shared/conversion-banners";
import { MemberSearchSelect } from "@/components/shared/member-search-select";

export default async function DashboardPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const dashboard = await getDashboardData(session.gym.id, session.settings?.expiring_warning_days ?? 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your gym at a glance. Focus on renewals, collections, and today's floor activity."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/members">
                <Plus className="h-4 w-4" />
                Add member
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/billing">
                <CreditCard className="h-4 w-4" />
                Collect fee
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reminders">
                <BellRing className="h-4 w-4" />
                Send reminders
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={`${dashboard.activeMembersCount}`} icon={UsersRound} />
        <StatCard label="Collected this month" value={formatCurrency(dashboard.monthlyRevenue)} icon={CreditCard} tone="success" />
        <StatCard label="Pending dues" value={formatCurrency(dashboard.pendingDueAmount)} icon={BellRing} tone="danger" />
        <StatCard label="Expiring this week" value={`${dashboard.expiringThisWeek.length}`} icon={BellRing} tone="warning" />
      </div>

      <ConversionBanners
        tier={session.gymSubscription?.tier ?? "basic"}
        monthlyRevenue={dashboard.monthlyRevenue}
        activeMembersCount={dashboard.activeMembersCount}
        pendingDueAmount={dashboard.pendingDueAmount}
        expiringCount={dashboard.expiringThisWeek.length}
        pendingDuesCount={dashboard.pendingDueAmount > 0 ? Math.max(1, Math.round(dashboard.pendingDueAmount / 200000)) : 0}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Expiring this week</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">These are the members who need attention first.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/reminders">Open reminders</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.expiringThisWeek.length ? (
              dashboard.expiringThisWeek.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.members.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{item.members.phone}</p>
                    </div>
                    <Badge variant="warning">Expiring soon</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Ends {item.currentSubscription ? formatDate(item.currentSubscription.effective_end_date) : "-"}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/members/${item.member_id}`}>View member</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-white/[0.03] p-6 text-sm text-muted-foreground">
                Nothing urgent right now. No memberships are expiring this week.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapid Check-in</CardTitle>
              <p className="text-sm text-muted-foreground">Search a member to mark today&apos;s attendance.</p>
            </CardHeader>
            <CardContent>
              <form action={markAttendanceAction} className="space-y-4">
                <MemberSearchSelect
                  name="membershipId"
                  memberships={dashboard.memberships.map((m) => ({
                    id: m.id,
                    label: `${m.members.full_name} (${m.members.phone})`,
                  }))}
                />
                <input type="hidden" name="checkInDate" value={new Date().toISOString().slice(0, 10)} />
                <Button type="submit" className="w-full h-12 rounded-2xl bg-accent shadow-glow">
                  Log Entry
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <p className="text-sm text-muted-foreground">Payments, attendance, and reminders.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recentActivity.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground mb-1 pr-2">{activity.title}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{formatDate(activity.created_at, "dd MMM, hh:mm a")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{activity.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
