import { redirect } from "next/navigation";
import { completeOnboardingAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getSessionContext();
  if (!session.user) redirect("/login");
  if (session.gym && session.gymSubscription) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-hero-grid bg-hero-grid px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Set up RepCore</CardTitle>
            <CardDescription>Create your gym, settings, and first membership plan in one shot.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={completeOnboardingAction} className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input id="orgName" name="orgName" placeholder="Aman Fitness Group" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymName">Gym name</Label>
                <Input id="gymName" name="gymName" placeholder="Aman Fitness Club" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymPhone">Gym phone</Label>
                <Input id="gymPhone" name="gymPhone" placeholder="+91 98765 43210" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gymAddress">Address</Label>
                <Input id="gymAddress" name="gymAddress" placeholder="Ranjit Avenue, Amritsar" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstPlanName">First plan name</Label>
                <Input id="firstPlanName" name="firstPlanName" defaultValue="Monthly" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstPlanDurationDays">Plan duration (days)</Label>
                <Input id="firstPlanDurationDays" name="firstPlanDurationDays" type="number" defaultValue="30" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstPlanPriceRupees">Plan price (INR)</Label>
                <Input id="firstPlanPriceRupees" name="firstPlanPriceRupees" type="number" step="0.01" defaultValue="1500" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renewalMode">Renewal mode</Label>
                <select
                  id="renewalMode"
                  name="renewalMode"
                  defaultValue="continue_from_last_end"
                  className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="continue_from_last_end">Continue from last end date</option>
                  <option value="restart_from_today">Restart from today</option>
                </select>
              </div>
              <input type="hidden" name="timezone" value="Asia/Kolkata" />
              <label className="col-span-full flex items-center gap-3 rounded-2xl border border-border bg-white/[0.04] px-4 py-3">
                <input type="checkbox" name="gstEnabled" className="h-4 w-4 accent-[#2563EB]" />
                <span className="text-sm">Enable GST on receipts</span>
              </label>
              {searchParams.error ? <p className="col-span-full text-sm text-danger">{searchParams.error}</p> : null}
              <div className="col-span-full flex justify-end">
                <Button type="submit" size="lg">
                  Finish setup
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
