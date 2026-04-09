import { getSessionContext } from "@/lib/auth/session";
import { getMembersPageData, getReminderTemplates } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { LockedGrowthCard } from "@/components/shared/locked-growth-card";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import { renderReminderTemplate } from "@/lib/utils/reminders";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function RemindersPage() {
  const session = await getSessionContext();
  const [members, templates] = await Promise.all([
    getMembersPageData(session.gym!.id, session.settings?.expiring_warning_days ?? 7),
    getReminderTemplates(session.gym!.id),
  ]);

  const expiryTemplate =
    templates.find((template) => template.template_type === "membership_expiry")?.body ??
    "Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]";

  const dueMembers = members.filter((member) => member.duePaise > 0 || member.status === "expiring_soon");

  return (
    <div className="space-y-6">
      <PageHeader title="Reminders" description="Use manual WhatsApp on Basic and keep the upgrade path clear for automation." />

      {!session.entitlements.automatedWhatsapp ? (
        <LockedGrowthCard
          title="Automated WhatsApp is locked"
          body="Growth sends reminders automatically and keeps a delivery log. Basic still gives you one-tap messaging."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members to message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueMembers.map((member) => {
            const message = renderReminderTemplate(expiryTemplate, {
              name: member.members.full_name,
              gymName: session.gym!.name,
              phone: session.gym!.phone,
              date: member.currentSubscription?.effective_end_date,
            });
            const url = buildWhatsAppUrl(member.members.phone, message);

            return (
              <div key={member.id} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{member.members.full_name}</p>
                    <p className="text-sm text-muted-foreground">{member.members.phone}</p>
                  </div>
                  <Badge variant={member.status === "expiring_soon" ? "warning" : "danger"}>
                    {member.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {member.currentSubscription ? `Expires ${formatDate(member.currentSubscription.effective_end_date)}` : "No live subscription"} - Due {formatCurrency(member.duePaise)}
                </p>
                <div className="mt-4">
                  <WhatsappButton
                    membershipId={member.id}
                    subscriptionId={member.currentSubscription?.subscription_id}
                    recipientPhone={member.members.phone}
                    renderedBody={message}
                    whatsappUrl={url}
                    size="sm"
                  >
                    Send on WhatsApp
                  </WhatsappButton>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
