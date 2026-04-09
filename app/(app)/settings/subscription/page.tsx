import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth/session";

const growthFeatures = [
  "Automated WhatsApp reminders",
  "Reminder delivery logs",
  "Scheduled renewal follow-ups",
  "Priority onboarding support",
  "Higher member limit",
];

export default async function SubscriptionPage() {
  const session = await getSessionContext();
  const isGrowth = session.gymSubscription?.tier === "growth";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Your RepCore plan</h1>
        <p className="text-muted-foreground">Manage your platform tier and see what is included.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="panel bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Current tier: {isGrowth ? "Growth" : "Basic"}
            </CardTitle>
            <CardDescription>
              {isGrowth
                ? "You are using the full power of RepCore. (Rs. 449 / month)"
                : "You are on the Basic tier. (Rs. 249 / month). Upgrade when you want WhatsApp automation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-semibold text-success">
                {session.gymSubscription?.status?.replaceAll("_", " ") ?? "Trialing"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <span className="text-sm text-muted-foreground">WhatsApp mode</span>
              <span className="text-sm font-semibold">{isGrowth ? "Automated" : "Manual"}</span>
            </div>
            <Button className="h-12 w-full rounded-2xl bg-accent shadow-glow" disabled>
              Billing management coming soon
            </Button>
          </CardContent>
        </Card>

        {!isGrowth ? (
          <Card className="panel border-accent/40 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Upgrade to Growth
              </CardTitle>
              <CardDescription>Move from manual reminders to automatic follow-ups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {growthFeatures.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <p className="text-2xl font-bold">
                  Rs. 449 <span className="text-sm font-normal text-muted-foreground">/ month</span>
                </p>
                <Button className="mt-4 h-12 w-full rounded-2xl bg-white text-black hover:bg-white/90" disabled>
                  Upgrade flow coming soon
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform billing history</CardTitle>
          <CardDescription>Invoices for your payments to RepCore will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center text-muted-foreground">
            <p>No platform invoices found yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
