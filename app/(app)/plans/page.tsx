import { redirect } from "next/navigation";
import { upsertMembershipPlanAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getMembershipPlans } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";

export default async function PlansPage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const plans = await getMembershipPlans(session.gym.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Membership plans" description="Create and manage the plans you sell from the front desk." />

      <Card>
        <CardHeader>
          <CardTitle>Create plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertMembershipPlanAction} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Plan name</Label>
              <Input id="name" name="name" placeholder="Quarterly" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input id="durationDays" name="durationDays" type="number" placeholder="90" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceRupees">Price (INR)</Label>
              <Input id="priceRupees" name="priceRupees" type="number" step="0.01" placeholder="4000" required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Save plan</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{plan.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.duration_days} days - {formatCurrency(plan.price_paise)}
                  </p>
                </div>
                <Badge variant={plan.is_active ? "success" : "default"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
              </div>

              <form action={upsertMembershipPlanAction} className="mt-4 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={plan.id} />
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={plan.name} />
                </div>
                <div className="space-y-2">
                  <Label>Days</Label>
                  <Input name="durationDays" type="number" defaultValue={plan.duration_days} />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input name="priceRupees" type="number" step="0.01" defaultValue={plan.price_paise / 100} />
                </div>
                <label className="sm:col-span-3 flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
                  <input type="checkbox" name="isActive" defaultChecked={plan.is_active} className="h-4 w-4 accent-[#2563EB]" />
                  <span className="text-sm">Active plan</span>
                </label>
                <div className="sm:col-span-3">
                  <Button type="submit" variant="outline">
                    Update plan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
