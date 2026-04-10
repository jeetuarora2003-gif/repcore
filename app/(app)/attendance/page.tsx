import { redirect } from "next/navigation";
import { markAttendanceAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getAttendancePageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/format";
import { MemberSearchSelect } from "@/components/shared/member-search-select";

export default async function AttendancePage() {
  const session = await getSessionContext();
  if (!session.gym) redirect("/setup");

  const data = await getAttendancePageData(session.gym.id);

  return (
    <div className="space-y-6 pb-28">
      <PageHeader title="Attendance" description="Log entries and track who showed up today." />

      <Card>
        <CardHeader>
          <CardTitle>Mark attendance</CardTitle>
          <p className="text-sm text-muted-foreground">Search a member by name or phone number.</p>
        </CardHeader>
        <CardContent>
          <form action={markAttendanceAction} className="space-y-4">
            <MemberSearchSelect
              name="membershipId"
              memberships={data.memberships.map((m) => ({
                id: m.id,
                label: `${m.members.full_name} (${m.members.phone})`,
              }))}
            />
            <div className="space-y-1">
              <Label htmlFor="checkInDate" className="text-xs text-muted-foreground">Date</Label>
              <Input
                id="checkInDate"
                name="checkInDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-2xl bg-accent shadow-glow">
              Log Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.todayEntries.length ? (
            data.todayEntries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                <p className="font-medium">{entry.memberships?.members?.full_name ?? "Unknown"}</p>
                <p className="mt-1 text-muted-foreground">Checked in at {formatDate(entry.checked_in_at, "hh:mm a")}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No entries logged today yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
