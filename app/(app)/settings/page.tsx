import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateGymProfileAction, updateGymSettingsAction, updateReminderTemplateAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getSettingsPageData, getBiometricSettingsData, getMembersPageData } from "@/lib/db/queries";
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
import { ThemePicker } from "@/components/shared/theme-picker";
import { BiometricSettings } from "@/components/attendance/biometric-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionContext();
  if (session.gymUser?.role !== "owner") {
    redirect("/dashboard");
  }

  const headersList = headers();
  const host = headersList.get("host") ?? "";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const domain = `${proto}://${host}`;

  const [data, biometricData, membersData] = await Promise.all([
    getSettingsPageData(session.gym!.id),
    getBiometricSettingsData(session.gym!.id),
    getMembersPageData(session.gym!.id, session.settings?.expiring_warning_days ?? 7),
  ]);

  const memberOptions = membersData
    .filter((m) => !m.archived_at)
    .map((m) => ({
      membershipId: m.id,
      memberId: m.member_id,
      fullName: m.members.full_name,
      phone: m.members.phone,
    }));

  return (
    <div className="space-y-6 pb-28">
      <PageHeader title="Settings" description="Gym profile, billing rules, and reminder templates." />

      <Card>
        <CardHeader><CardTitle>Gym profile</CardTitle></CardHeader>
        <CardContent>
          <form action={updateGymProfileAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="name">Gym name</Label><Input id="name" name="name" defaultValue={session.gym.name ?? ""} required /></div>
            <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={session.gym.phone ?? ""} required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={session.gym.address ?? ""} /></div>
            <div className="space-y-4 sm:col-span-2"><ImageUpload bucket="gym_logos" name="logoUrl" label="Gym Logo" defaultValue={session.gym.logo_url ?? ""} /></div>
            <div className="space-y-2"><Label htmlFor="gstNumber">GST number</Label><Input id="gstNumber" name="gstNumber" defaultValue={session.gym.gst_number ?? ""} /></div>
            <div className="sm:col-span-2"><Button type="submit">Save profile</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Billing rules</CardTitle></CardHeader>
        <CardContent>
          <form action={updateGymSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="expiringWarningDays">Expiring warning days</Label><Input id="expiringWarningDays" name="expiringWarningDays" type="number" defaultValue={session.settings?.expiring_warning_days ?? 7} /></div>
            <div className="space-y-2">
              <Label htmlFor="renewalMode">Renewal mode</Label>
              <select id="renewalMode" name="renewalMode" defaultValue={session.settings?.renewal_mode ?? "continue_from_last_end"} className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <option value="continue_from_last_end">Continue from last end date</option>
                <option value="restart_from_today">Restart from today</option>
              </select>
            </div>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
              <input type="checkbox" name="freezeBlocksCheckin" defaultChecked={session.settings?.freeze_blocks_checkin ?? true} className="mt-0.5 h-4 w-4 accent-[#2563EB]" />
              <div><span className="text-sm font-medium">Freeze blocks check-in</span><p className="text-xs text-muted-foreground mt-0.5">Frozen members cannot be marked present until unfrozen.</p></div>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
              <input type="checkbox" name="gstEnabled" defaultChecked={session.settings?.gst_enabled ?? false} className="mt-0.5 h-4 w-4 accent-[#2563EB]" />
              <div><span className="text-sm font-medium">GST enabled</span><p className="text-xs text-muted-foreground mt-0.5">Adds GST line item to invoices. Requires a valid GST number above.</p></div>
            </label>
            <div className="sm:col-span-2"><Button type="submit" variant="outline">Save settings</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plan management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {data.plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.duration_days} days &mdash; {formatCurrency(plan.price_paise)}</p>
              </div>
            ))}
          </div>
          <Button asChild variant="outline"><Link href="/plans">Open full plan manager</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>WhatsApp templates</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "fee_due", label: "Fee Due Reminder" },
            { key: "membership_expiry", label: "Membership Expiry Reminder" },
            { key: "welcome", label: "Welcome Message" },
          ].map(({ key, label }) => {
            const current = data.templates.find((t) => t.template_type === key);
            return (
              <form key={key} action={updateReminderTemplateAction} className="rounded-2xl border border-border bg-white/[0.03] p-4">
                <input type="hidden" name="templateType" value={key} />
                <div className="space-y-2">
                  <Label>{label}</Label>
                  <Textarea name="body" defaultValue={current?.body ?? "Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]"} />
                </div>
                <Button type="submit" variant="outline" className="mt-4">Save template</Button>
              </form>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications &amp; PWA</CardTitle>
          <CardDescription>Configure how you receive alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Browser Push Notifications</Label>
              <p className="text-xs text-muted-foreground">Get alerted even when the app is closed.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px] uppercase">Coming Soon</Badge>
              <Switch disabled />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Daily Attendance Report</Label>
              <p className="text-xs text-muted-foreground">Receive a WhatsApp summary at 10 PM.</p>
            </div>
            <Badge variant="default" className="text-[10px] uppercase">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Theme</CardTitle>
          <CardDescription>Personalise your RepCore accent colour. Applies instantly on this device.</CardDescription>
        </CardHeader>
        <CardContent><ThemePicker /></CardContent>
      </Card>
      {/* Biometric Device */}
      <Card>
        <CardHeader>
          <CardTitle>Biometric Device</CardTitle>
          <CardDescription>
            Connect a fingerprint or face recognition device to auto-sync attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BiometricSettings
            biometricToken={biometricData.biometricToken}
            lastBiometricPush={biometricData.lastBiometricPush}
            unmatchedLogs={biometricData.unmatchedLogs}
            members={memberOptions}
            domain={domain}
          />
        </CardContent>
      </Card>
    </div>
  );
}
