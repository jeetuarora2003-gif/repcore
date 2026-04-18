import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheet, Wallet } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { getReportsData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function ReportsPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const reports = await getReportsData(session.gym.id, session.settings?.expiring_warning_days ?? 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="The daily numbers that actually matter."
        actions={
          <Button asChild variant="outline">
            <Link href="/api/export/members">
              <FileSpreadsheet className="h-4 w-4" />
              Export members CSV
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue this month" value={formatCurrency(reports.summary.monthlyRevenue)} icon={Wallet} tone="success" />
        <StatCard label="Pending dues" value={formatCurrency(reports.summary.pendingDueAmount)} icon={Wallet} tone="danger" />
        <StatCard label="Active members" value={`${reports.summary.activeMembersCount}`} icon={Wallet} />
        <StatCard label="Expiring this week" value={`${reports.summary.expiringThisWeek.length}`} icon={Wallet} tone="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dues list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.dueMembers.map((member) => (
              <div key={member.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{member.members.full_name}</p>
                  <span className="text-sm font-medium text-danger">{formatCurrency(member.duePaise)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{member.members.phone}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring memberships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.expiring.map((member) => (
              <div key={member.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{member.members.full_name}</p>
                  <span className="text-sm font-medium text-warning">
                    {member.currentSubscription ? formatDate(member.currentSubscription.effective_end_date) : "-"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{member.currentSubscription?.plan_snapshot_name ?? "No plan"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
