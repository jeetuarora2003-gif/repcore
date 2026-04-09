import Link from "next/link";
import { redirect } from "next/navigation";
import { updateGymProfileAction, updateGymSettingsAction, updateReminderTemplateAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getSettingsPageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/shared/image-upload";

export default async function SettingsPage() {
  const session = await getSessionContext();
  if (session.gymUser?.role !== "owner") {
    redirect("/dashboard");
  }

  const data = await getSettingsPageData(session.gym!.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Gym profile, billing rules, and reminder templates." />

      <Card>
        <CardHeader>
          <CardTitle>Gym profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateGymProfileAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Gym name</Label>
              <Input id="name" name="name" defaultValue={session.gym?.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={session.gym?.phone ?? ""} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={session.gym?.address ?? ""} />
            </div>
            <div className="space-y-4 sm:col-span-2">
              <ImageUpload 
                bucket="gym_logos" 
                name="logoUrl" 
                label="Gym Logo" 
                defaultValue={session.gym?.logo_url ?? ""} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upiVpa">UPI ID (for dynamic QR)</Label>
              <Input id="upiVpa" name="upiVpa" placeholder="merchant@okupi" defaultValue={session.gym?.upi_vpa ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST number</Label>
              <Input id="gstNumber" name="gstNumber" defaultValue={session.gym?.gst_number ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing rules</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateGymSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expiringWarningDays">Expiring warning days</Label>
              <Input id="expiringWarningDays" name="expiringWarningDays" type="number" defaultValue={session.settings?.expiring_warning_days ?? 7} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewalMode">Renewal mode</Label>
              <select
                id="renewalMode"
                name="renewalMode"
                defaultValue={session.settings?.renewal_mode ?? "continue_from_last_end"}
                className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <option value="continue_from_last_end">Continue from last end date</option>
                <option value="restart_from_today">Restart from today</option>
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
              <input type="checkbox" name="freezeBlocksCheckin" defaultChecked={session.settings?.freeze_blocks_checkin ?? true} className="h-4 w-4 accent-[#2563EB]" />
              <span className="text-sm">Freeze blocks check-in</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
              <input type="checkbox" name="gstEnabled" defaultChecked={session.settings?.gst_enabled ?? false} className="h-4 w-4 accent-[#2563EB]" />
              <span className="text-sm">GST enabled</span>
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline">
                Save settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {data.plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.duration_days} days - INR {plan.price_paise / 100}
                </p>
              </div>
            ))}
          </div>
          <Button asChild variant="outline">
            <Link href="/plans">Open full plan manager</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {["fee_due", "membership_expiry", "welcome"].map((type) => {
            const current = data.templates.find((template) => template.template_type === type);
            return (
              <form key={type} action={updateReminderTemplateAction} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <input type="hidden" name="templateType" value={type} />
                <div className="space-y-2">
                  <Label>{type.replaceAll("_", " ")}</Label>
                  <Textarea name="body" defaultValue={current?.body ?? "Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]"} />
                </div>
                <Button type="submit" variant="outline" className="mt-4">
                  Save template
                </Button>
              </form>
            );
          })}
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Notifications & PWA</CardTitle>
            <CardDescription>Configure how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Browser Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Get alerted even when the app is closed.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">Coming Soon</Badge>
                <Switch disabled />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Attendance Report</Label>
                <p className="text-xs text-muted-foreground">Receive a WhatsApp summary at 10 PM.</p>
              </div>
              <Switch defaultChecked={session.gym?.tier === "growth"} />
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
