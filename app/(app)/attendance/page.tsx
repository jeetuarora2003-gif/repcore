import Link from "next/link";
import { format, differenceInHours, parseISO } from "date-fns";
import { Fingerprint, Hand, Upload, AlertTriangle } from "lucide-react";
import { markAttendanceAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { getAttendancePageData } from "@/lib/db/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatRelativeDate } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

function BiometricStatusPill({
  lastBiometricPush,
}: {
  lastBiometricPush: string | null;
}) {
  if (!lastBiometricPush) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        No device connected
      </span>
    );
  }

  const hoursAgo = differenceInHours(new Date(), parseISO(lastBiometricPush));

  if (hoursAgo <= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Live sync active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      Last sync {formatRelativeDate(lastBiometricPush)}
    </span>
  );
}

function SourceIcon({ source }: { source?: string }) {
  if (source === "biometric_push" || source === "biometric_upload") {
    return (
      <span title="Biometric device" className="text-accent">
        <Fingerprint className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span title="Manual check-in" className="text-muted-foreground">
      <Hand className="h-3.5 w-3.5" />
    </span>
  );
}

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string, error?: string }> }) {
  try {
    const session = await getSessionContext();
    const searchParamsObj = await searchParams;
    const selectedDate = searchParamsObj.date ?? format(new Date(), "yyyy-MM-dd");
    const data = await getAttendancePageData(session.gym!.id, selectedDate);
    const membershipLookup = new Map(
      (data?.memberships ?? []).map((membership) => [membership.id, membership]),
    );

    const attendance = data?.attendance ?? [];
    const unmatchedCount = data?.unmatchedCount ?? 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Attendance"
            description="Manual check-in built for the front desk. One check-in per member per day."
          />
          <div className="flex flex-shrink-0 items-center gap-3">
            <BiometricStatusPill lastBiometricPush={data?.lastBiometricPush ?? null} />
            <Button asChild variant="outline" size="sm">
              <Link href="/attendance/upload">
                <Upload className="h-4 w-4" />
                Import file
              </Link>
            </Button>
          </div>
        </div>

        {/* Unmatched device IDs banner */}
        {unmatchedCount > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-warning">
                {unmatchedCount} unmatched device ID{unmatchedCount !== 1 ? "s" : ""} found
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                These device user IDs don&apos;t match any enrolled member.{" "}
                <Link href="/settings#biometric" className="text-accent underline-offset-2 hover:underline">
                  Link them to members →
                </Link>
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Mark attendance</CardTitle>
            <p className="text-sm text-muted-foreground">Search a member by name or phone number.</p>
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
                  {(data?.memberships ?? []).map((membership) => (
                    <option key={membership.id} value={membership.id}>
                      {membership.members.full_name} ({membership.members.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkInDate">Date</Label>
                <Input
                  id="checkInDate"
                  name="checkInDate"
                  type="date"
                  defaultValue={selectedDate}
                  required
                />
              </div>
              {searchParamsObj.error ? (
                <p className="sm:col-span-3 text-sm text-danger">{searchParamsObj.error}</p>
              ) : null}
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
            <div className="flex items-center justify-between">
              <CardTitle>Daily log — {formatDate(selectedDate)}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {attendance.length} check-in{attendance.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendance.length ? (
              attendance.map((entry) => {
                const membership = membershipLookup.get(entry.membership_id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] px-4 py-3"
                  >
                    <SourceIcon source={entry.source} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {membership?.members.full_name ?? entry.membership_id}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(entry.checked_in_at, "hh:mm a")}
                        {entry.source && entry.source !== "manual" ? (
                          <span className="ml-2 text-accent/70">
                            {entry.source === "biometric_push" ? "device push" : "file import"}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={Fingerprint}
                title="No check-ins yet"
                body="Mark members manually above, or connect a biometric device to auto-sync."
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-8 text-danger bg-danger/10 border border-danger rounded-xl">
        <h2 className="font-bold text-xl mb-4">CRITICAL RUNTIME EXCEPTION CAUGHT:</h2>
        <pre className="whitespace-pre-wrap font-mono text-sm">{err?.message}</pre>
        <pre className="whitespace-pre-wrap font-mono text-xs mt-4 text-muted-foreground">{err?.stack}</pre>
        <pre className="whitespace-pre-wrap font-mono text-xs mt-4 text-warning">Stringified: {JSON.stringify(err)}</pre>
      </div>
    );
  }
}
