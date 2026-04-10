import Link from "next/link";
import { Search, UsersRound } from "lucide-react";
import { CreateMemberForm } from "@/components/members/create-member-form";
import { getSessionContext } from "@/lib/auth/session";
import { getMembersPageData, getMembershipPlans } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { redirect } from "next/navigation";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");
  const { q, status } = await searchParams;
  const [members, plans] = await Promise.all([
    getMembersPageData(session.gym.id, session.settings?.expiring_warning_days ?? 7, q, status),
    getMembershipPlans(session.gym.id),
  ]);

  return (
    <div className="space-y-6 pb-28">
      <PageHeader title="Members" description="Manage joins, renewals, archives, and member status from one place." />
      <Card><CardHeader><CardTitle>Add member</CardTitle></CardHeader><CardContent><CreateMemberForm plans={plans} /></CardContent></Card>
      <Card>
        <CardContent className="pt-5">
          <form className="grid gap-3 grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto]">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" name="q" placeholder="Search by name or phone" defaultValue={q ?? ""} />
            </div>
            <select name="status" defaultValue={status ?? "all"} className="flex h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="frozen">Frozen</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>
      {members.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold truncate">{member.members.full_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground truncate">{member.members.phone}</p>
                  </div>
                  <Badge className="flex-shrink-0" variant={member.status === "active" ? "success" : member.status === "expiring_soon" ? "warning" : member.status === "expired" ? "danger" : "default"}>{member.status.replaceAll("_", " ")}</Badge>
                </div>
                <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-white/[0.03] p-4 sm:grid-cols-2">
                  <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</p><p className="mt-2 text-sm font-medium">{member.currentSubscription?.plan_snapshot_name ?? "No active plan"}</p></div>
                  <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due</p><p className="mt-2 text-sm font-medium">{formatCurrency(member.duePaise)}</p></div>
                  <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ends</p><p className="mt-2 text-sm font-medium">{member.currentSubscription ? formatDate(member.currentSubscription.effective_end_date) : "-"}</p></div>
                  <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Joined</p><p className="mt-2 text-sm font-medium">{formatDate(member.members.joined_on)}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild size="sm"><Link href={`/members/${member.member_id}`}>Open member</Link></Button>
                  {member.duePaise > 0 ? <Button asChild size="sm" variant="outline"><Link href={`/billing?membershipId=${member.id}`}>Collect fee</Link></Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={UsersRound} title="No members yet" body="Add your first member to get started." action={<Button asChild><Link href="#fullName">Start with a member</Link></Button>} />
      )}
    </div>
  );
}
