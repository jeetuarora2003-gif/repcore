import { CheckCircle2, CreditCard, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth/session";

export default async function SubscriptionPage() {
  const session = await getSessionContext();
  const isGrowth = session.gym?.tier === "growth";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Your RepCore Plan</h1>
        <p className="text-muted-foreground">Manage your subscription with the platform.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <Card className="panel bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Current Tier: {isGrowth ? "Growth" : "Basic"}
            </CardTitle>
            <CardDescription>
              {isGrowth 
                ? "You are using the full power of RepCore. (Rs. 499 / Month)" 
                : "You are on the Basic tier. (Rs. 299 / Month). Upgrade for automation features."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-semibold text-success">Active / Trialing</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Next payment date</span>
                <span className="text-sm font-semibold">In 14 days</span>
            </div>

            <Button className="w-full h-12 rounded-2xl bg-accent shadow-glow">
                Manage Billing on Stripe
            </Button>
          </CardContent>
        </Card>

        {/* Upgrade / Comparison */}
        {!isGrowth && (
          <Card className="panel border-accent/40 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Upgrade to Growth
              </CardTitle>
              <CardDescription>Get the best out of your gym management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  "Dynamic UPI QR Generation",
                  "Staff Media Uploads (Member Photos)",
                  "Custom WhatsApp Reminders",
                  "Priority WhatsApp Support",
                  "Multi-staff Access"
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <p className="text-2xl font-bold">₹499 <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
                <Button className="mt-4 w-full h-12 rounded-2xl bg-white text-black hover:bg-white/90">
                    Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Platform Payment Invoices</CardTitle>
            <CardDescription>Invoices for your payments to RepCore.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-10 text-muted-foreground">
                <p>No platform invoices found yet.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
