import Link from "next/link";
import { MessageCircleMore, RefreshCcw, HandCoins } from "lucide-react";
import { reactivateLapsedMemberAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { MemberStatusBadge, MemberStatusType } from "./member-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { buildReminderMessage } from "@/lib/utils/reminders";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";

// Adjust these types to match what's returned from getMembersPageData
type MemberCardProps = {
  member: any;
  gymName: string;
};

export function MemberCard({ member, gymName }: MemberCardProps) {
  const isLapsed = member.status === "lapsed";
  const isExpiring = member.status === "expiring_soon";
  const isActive = member.status === "active";
  const isArchived = member.status === "archived";

  const hasDues = member.duePaise > 0;
  
  let expiryLabel = "Ends";
  let expiryDate = member.currentSubscription ? formatDate(member.currentSubscription.effective_end_date) : "—";
  let planName = member.currentSubscription?.plan_snapshot_name ?? "No plan";

  if (isLapsed && member.lapsed_at) {
    expiryLabel = "Expired";
    // We try to pull the last end date from the subscription if it's there
    expiryDate = member.currentSubscription ? formatDate(member.currentSubscription.effective_end_date) : formatDate(member.lapsed_at);
  } else if (isArchived && member.archived_at) {
    expiryLabel = "Archived";
    expiryDate = formatDate(member.archived_at);
  }

  // Calculate days remaining precisely if expiring
  let daysRemaining = null;
  if (isExpiring && member.currentSubscription) {
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const todayIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
      const endDate = new Date(member.currentSubscription.effective_end_date + "T00:00:00+05:30");
      const endDateLocal = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const diffMs = endDateLocal.getTime() - todayIST.getTime();
      daysRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      {/* TOP ROW */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-center gap-3 min-w-0">
          <MemberAvatar 
            name={member.members.full_name} 
            photoUrl={member.members.photo_url} 
            status={member.status} 
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-[15px] font-medium leading-none truncate">{member.members.full_name}</h3>
            <p className="text-xs text-muted-foreground truncate">{planName}</p>
          </div>
        </div>
        <MemberStatusBadge status={member.status} expiryDays={daysRemaining} />
      </div>

      {/* MIDDLE ROW */}
      <div className="flex items-center justify-between border-y border-border/50 bg-white/[0.02] px-5 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{expiryLabel}</span>
          <span className="text-sm font-medium">{expiryDate}</span>
        </div>
        <div className="flex flex-col items-end">
          {hasDues ? (
            <>
              <span className="text-xs text-muted-foreground">Outstanding</span>
              <span className="font-mono text-sm font-semibold text-danger">{formatCurrency(member.duePaise)}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-success my-auto">Paid ✓</span>
          )}
        </div>
      </div>

      {/* BOTTOM ROW (Actions) */}
      <div className="flex flex-wrap items-center gap-2 p-4">
        {isActive && !hasDues && (
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link href={`/members/${member.member_id}`}>View Profile</Link>
          </Button>
        )}

        {isActive && hasDues && (
          <>
            <Button asChild size="sm" variant="outline" className="border-success text-success hover:bg-success/10 hover:text-success w-full sm:w-auto">
              <Link href={`/billing?membershipId=${member.id}`}>
                <HandCoins className="mr-2 h-4 w-4" />
                Collect {formatCurrency(member.duePaise)}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
              <Link href={`/members/${member.member_id}`}>View Profile</Link>
            </Button>
          </>
        )}

        {isExpiring && (
          <>
            <Button asChild size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10 hover:text-warning w-full sm:w-auto">
              <Link href={`/billing?membershipId=${member.id}`}>
                {hasDues ? `Collect ${formatCurrency(member.duePaise)}` : "Collect Renew Fee"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
              <Link href={`/members/${member.member_id}`}>View Profile</Link>
            </Button>
          </>
        )}

        {isLapsed && (
          <>
            <Button size="sm" asChild variant="outline" className="border-danger text-danger hover:bg-danger/10 hover:text-danger w-full sm:w-auto">
              <a href={buildWhatsAppUrl(member.members.phone, buildReminderMessage("lapsed", { name: member.members.full_name, gymName }))} target="_blank" rel="noopener noreferrer">
                <MessageCircleMore className="mr-2 h-4 w-4" />
                Send WhatsApp
              </a>
            </Button>
            <form action={reactivateLapsedMemberAction} className="w-full sm:w-auto">
              <input type="hidden" name="membershipId" value={member.id} />
              <input type="hidden" name="memberId" value={member.member_id} />
              <Button type="submit" variant="default" size="sm" className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reactivate
              </Button>
            </form>
          </>
        )}

        {isArchived && (
          <>
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
               <Link href={`/members/${member.member_id}`}>View Profile</Link>
            </Button>
            {/* Note: Restore action would go here if we want to restore from list. Currently keeping simple. */}
          </>
        )}

        {(!isLapsed && !isExpiring && !isActive && !isArchived) && (
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
               <Link href={`/members/${member.member_id}`}>View Profile</Link>
            </Button>
        )}
      </div>
    </div>
  );
}
