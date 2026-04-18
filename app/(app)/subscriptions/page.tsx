import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getSubscriptionsPageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export default async function SubscriptionsPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const groups = await getSubscriptionsPageData(session.gym.id, session.settings?.expiring_warning_days ?? 7);

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Track live memberships, upcoming renewals, and archived histories." />

      <div className="grid gap-6 xl:grid-cols-3">
        {[
          { key: "live", title: "Live members", items: groups.live },
          { key: "expired", title: "Expired", items: groups.expired },
          { key: "archived", title: "Archived", items: groups.archived },
        ].map((group) => (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle>
                {group.title} <span className="text-sm text-muted-foreground">({group.items.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.members.full_name}</p>
                      <p className="text-sm text-muted-foreground">{item.currentSubscription?.plan_snapshot_name ?? "No plan"}</p>
                    </div>
                    <Badge variant={group.key === "expired" ? "danger" : group.key === "archived" ? "default" : "success"}>
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.currentSubscription ? `Ends ${formatDate(item.currentSubscription.effective_end_date)}` : "No active subscription"}
                  </p>
                  <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
                    <Link href={`/members/${item.member_id}`}>Open member</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
