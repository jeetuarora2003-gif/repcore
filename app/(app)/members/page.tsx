import Link from "next/link";
import { MessageCircleMore, Search, UserX, UsersRound } from "lucide-react";
import { AddMemberWizard } from "@/components/members/add-member-wizard";
import { reactivateLapsedMemberAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getMembersPageData, getMembershipPlans, getLapsedMembers, markMembershipsLapsed } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { buildReminderMessage } from "@/lib/utils/reminders";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { redirect } from "next/navigation";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");
  const { q, status } = await searchParams;

  // Background lapse check — runs on every members page load
  await markMembershipsLapsed(session.gym.id);

  const isLapsedView = status === "lapsed";

  const [members, plans, lapsedMembers] = await Promise.all([
    getMembersPageData(session.gym.id, session.settings?.expiring_warning_days ?? 7, q, isLapsedView ? "all" : status),
    getMembershipPlans(session.gym.id),
    isLapsedView ? getLapsedMembers(session.gym.id) : Promise.resolve([]),
  ]);

  const gymName = session.gym.name;

  return (
    <div className="space-y-6 pb-28">
      <PageHeader title="Members" description="Manage joins, renewals, archives, and member status from one place." />

      <AddMemberWizard plans={plans} />

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
              <option value="lapsed">Lapsed</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Lapsed members view */}
      {isLapsedView ? (
        lapsedMembers.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {lapsedMembers.map((member) => {
              const lapsedMsg = buildReminderMessage("lapsed", {
                name: member.memberName,
                gymName,
              });
              const waUrl = buildWhatsAppUrl(member.memberPhone, lapsedMsg);

              return (
                <Card key={member.membershipId}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold truncate">{member.memberName}</p>
                        <p className="mt-1 text-sm text-muted-foreground truncate">{member.memberPhone}</p>
                      </div>
                      <Badge variant="danger">lapsed</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-white/[0.03] p-4 sm:grid-cols-3">
                      <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last Plan</p><p className="mt-2 text-sm font-medium">{member.lastPlanName ?? "—"}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expired</p><p className="mt-2 text-sm font-medium">{member.lastEndDate ? formatDate(member.lastEndDate) : "—"}</p></div>
                      <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due</p><p className="mt-2 text-sm font-semibold text-danger">{formatCurrency(member.duePaise)}</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button size="sm" asChild>
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircleMore className="h-4 w-4" />
                          Send WhatsApp
                        </a>
                      </Button>
                      <form action={reactivateLapsedMemberAction}>
                        <input type="hidden" name="membershipId" value={member.membershipId} />
                        <input type="hidden" name="memberId" value={member.memberId} />
                        <Button type="submit" variant="outline" size="sm">Reactivate</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<UserX className="h-8 w-8" />} title="No lapsed members" body="Members who expire with unpaid dues will appear here automatically." />
        )
      ) : (
        /* Normal members view */
        members.length ? (
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
          <EmptyState icon={<UsersRound className="h-8 w-8" />} title="No members yet" body="Add your first member to get started." action={<Button asChild><Link href="#fullName">Start with a member</Link></Button>} />
        )
      )}
    </div>
  );
}
