import { format } from "date-fns";
import { UserRoundCheck } from "lucide-react";
import { markAttendanceAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getAttendancePageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/format";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const session = await getSessionContext();
  const searchParamsObj = await searchParams;
  const selectedDate = searchParamsObj.date ?? format(new Date(), "yyyy-MM-dd");
  const data = await getAttendancePageData(session.gym!.id, selectedDate);
  const membershipLookup = new Map(data.memberships.map((membership) => [membership.id, membership]));

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Manual check-in built for the front desk. One check-in per member per day." />

      <Card>
        <CardHeader>
          <CardTitle>Mark attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={markAttendanceAction} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="attendanceMembershipId">Membership</Label>
              <select
                id="attendanceMembershipId"
                name="membershipId"
                required
                className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {data.memberships.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {membership.members.full_name} ({membership.members.phone})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkInDate">Date</Label>
              <Input id="checkInDate" name="checkInDate" type="date" defaultValue={selectedDate} required />
            </div>
            {searchParamsObj.error ? <p className="sm:col-span-3 text-sm text-danger">{searchParamsObj.error}</p> : null}
            <div className="sm:col-span-3">
              <Button type="submit" className="w-full sm:w-auto">
                Check in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.attendance.length ? (
            data.attendance.map((entry) => {
              const membership = membershipLookup.get(entry.membership_id);

              return (
                <div key={entry.id} className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-medium">{membership?.members.full_name ?? entry.membership_id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Checked in on {formatDate(entry.check_in_date)} at {formatDate(entry.checked_in_at, "hh:mm a")}
                  </p>
                </div>
              );
            })
          ) : (
            <EmptyState icon={UserRoundCheck} title="No check-ins yet" body="Start with the first member check-in for today." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
